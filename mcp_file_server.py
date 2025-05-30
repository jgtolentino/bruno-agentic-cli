#!/usr/bin/env python3
"""
MCP File Server - Enables Claude.ai to read/write files via controlled proxy
Provides secure file operations with sandboxing and audit logging
"""

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, validator
import os
import json
import hashlib
import datetime
from pathlib import Path
from typing import Optional, List
import asyncio
import aiofiles

app = FastAPI(title="MCP File Server", version="1.0.0")

# Configuration
ALLOWED_EXTENSIONS = {'.md', '.txt', '.json', '.yaml', '.yml', '.js', '.ts', '.py', '.html', '.css'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
SANDBOX_ROOT = Path.cwd()
AUDIT_LOG = "mcp_audit.log"

class FileOperation(BaseModel):
    path: str
    content: Optional[str] = None
    mode: str = "read"  # read, write, edit, append, delete, list
    instruction: Optional[str] = None  # For edit operations
    
    @validator('path')
    def validate_path(cls, v):
        # Security: Prevent path traversal
        if '..' in v or v.startswith('/'):
            raise ValueError('Invalid path: path traversal not allowed')
        return v
    
    @validator('mode')
    def validate_mode(cls, v):
        allowed_modes = {'read', 'write', 'edit', 'append', 'delete', 'list'}
        if v not in allowed_modes:
            raise ValueError(f'Invalid mode. Allowed: {allowed_modes}')
        return v

class FileResponse(BaseModel):
    status: str
    content: Optional[str] = None
    message: Optional[str] = None
    files: Optional[List[str]] = None
    hash: Optional[str] = None

async def log_operation(operation: str, path: str, success: bool, message: str = ""):
    """Audit logging for all file operations"""
    timestamp = datetime.datetime.now().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "operation": operation,
        "path": path,
        "success": success,
        "message": message
    }
    
    async with aiofiles.open(AUDIT_LOG, 'a') as f:
        await f.write(json.dumps(log_entry) + '\n')

def is_safe_path(path: str) -> bool:
    """Check if path is within sandbox and has allowed extension"""
    try:
        full_path = (SANDBOX_ROOT / path).resolve()
        
        # Must be within sandbox
        if not str(full_path).startswith(str(SANDBOX_ROOT.resolve())):
            return False
            
        # Must have allowed extension (for write operations)
        if full_path.suffix.lower() not in ALLOWED_EXTENSIONS and full_path.suffix:
            return False
            
        return True
    except:
        return False

def get_file_hash(content: str) -> str:
    """Generate hash for file content verification"""
    return hashlib.sha256(content.encode()).hexdigest()[:16]

@app.get("/")
async def root():
    return {"service": "MCP File Server", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "sandbox_root": str(SANDBOX_ROOT)}

@app.post("/file", response_model=FileResponse)
async def file_operation(op: FileOperation):
    """Main file operation endpoint"""
    
    if not is_safe_path(op.path):
        await log_operation(op.mode, op.path, False, "Unsafe path")
        raise HTTPException(status_code=400, detail="Invalid or unsafe file path")
    
    full_path = SANDBOX_ROOT / op.path
    
    try:
        if op.mode == "read":
            if not full_path.exists():
                await log_operation("read", op.path, False, "File not found")
                raise HTTPException(status_code=404, detail="File not found")
            
            async with aiofiles.open(full_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            
            file_hash = get_file_hash(content)
            await log_operation("read", op.path, True, f"Read {len(content)} chars")
            
            return FileResponse(
                status="success",
                content=content,
                hash=file_hash,
                message=f"File read successfully ({len(content)} characters)"
            )
        
        elif op.mode == "write":
            if not op.content:
                raise HTTPException(status_code=400, detail="Content required for write operation")
            
            # Check file size
            if len(op.content.encode()) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="File too large")
            
            # Create directory if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
                await f.write(op.content)
            
            file_hash = get_file_hash(op.content)
            await log_operation("write", op.path, True, f"Written {len(op.content)} chars")
            
            return FileResponse(
                status="success",
                hash=file_hash,
                message=f"File written successfully ({len(op.content)} characters)"
            )
        
        elif op.mode == "append":
            if not op.content:
                raise HTTPException(status_code=400, detail="Content required for append operation")
            
            # Create file if it doesn't exist
            if not full_path.exists():
                full_path.parent.mkdir(parents=True, exist_ok=True)
                async with aiofiles.open(full_path, 'w') as f:
                    pass
            
            async with aiofiles.open(full_path, 'a', encoding='utf-8') as f:
                await f.write(op.content)
            
            # Read back for hash
            async with aiofiles.open(full_path, 'r', encoding='utf-8') as f:
                final_content = await f.read()
            
            file_hash = get_file_hash(final_content)
            await log_operation("append", op.path, True, f"Appended {len(op.content)} chars")
            
            return FileResponse(
                status="success",
                hash=file_hash,
                message=f"Content appended successfully ({len(op.content)} characters)"
            )
        
        elif op.mode == "edit":
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            if not op.content:
                raise HTTPException(status_code=400, detail="Content required for edit operation")
            
            # Read original content
            async with aiofiles.open(full_path, 'r', encoding='utf-8') as f:
                original = await f.read()
            
            # Write new content
            async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
                await f.write(op.content)
            
            file_hash = get_file_hash(op.content)
            await log_operation("edit", op.path, True, f"Edited {len(op.content)} chars")
            
            return FileResponse(
                status="success",
                hash=file_hash,
                message=f"File edited successfully ({len(op.content)} characters)"
            )
        
        elif op.mode == "delete":
            if not full_path.exists():
                raise HTTPException(status_code=404, detail="File not found")
            
            full_path.unlink()
            await log_operation("delete", op.path, True, "File deleted")
            
            return FileResponse(
                status="success",
                message="File deleted successfully"
            )
        
        elif op.mode == "list":
            if full_path.is_file():
                # List info about single file
                stat = full_path.stat()
                files = [f"{full_path.name} ({stat.st_size} bytes)"]
            else:
                # List directory contents
                if not full_path.exists():
                    full_path = SANDBOX_ROOT
                
                files = []
                for item in full_path.iterdir():
                    if item.is_file():
                        stat = item.stat()
                        files.append(f"{item.name} ({stat.st_size} bytes)")
                    elif item.is_dir():
                        files.append(f"{item.name}/ (directory)")
            
            await log_operation("list", op.path, True, f"Listed {len(files)} items")
            
            return FileResponse(
                status="success",
                files=files,
                message=f"Listed {len(files)} items"
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid operation mode")
    
    except HTTPException:
        raise
    except Exception as e:
        await log_operation(op.mode, op.path, False, str(e))
        raise HTTPException(status_code=500, detail=f"Operation failed: {str(e)}")

@app.get("/audit")
async def get_audit_log(limit: int = 50):
    """Get recent audit log entries"""
    try:
        if not Path(AUDIT_LOG).exists():
            return {"entries": []}
        
        async with aiofiles.open(AUDIT_LOG, 'r') as f:
            lines = await f.readlines()
        
        # Get last N lines
        recent_lines = lines[-limit:]
        entries = []
        
        for line in recent_lines:
            try:
                entries.append(json.loads(line.strip()))
            except:
                continue
        
        return {"entries": entries, "total": len(entries)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read audit log: {str(e)}")

@app.get("/files")
async def list_files():
    """List all files in sandbox"""
    try:
        files = []
        for item in SANDBOX_ROOT.rglob("*"):
            if item.is_file():
                rel_path = item.relative_to(SANDBOX_ROOT)
                stat = item.stat()
                files.append({
                    "path": str(rel_path),
                    "size": stat.st_size,
                    "modified": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return {"files": files, "total": len(files), "sandbox_root": str(SANDBOX_ROOT)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print(f"🗂️  MCP File Server starting...")
    print(f"📁 Sandbox root: {SANDBOX_ROOT}")
    print(f"🔒 Allowed extensions: {ALLOWED_EXTENSIONS}")
    print(f"📊 Max file size: {MAX_FILE_SIZE // 1024 // 1024}MB")
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=True)