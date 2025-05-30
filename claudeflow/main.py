"""
ClaudeFlow Middleware System
Main FastAPI server for orchestrating Claude → Google Docs pipeline
"""

import os
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import json
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import yaml
from dotenv import load_dotenv

from services.claude_executor import ClaudeExecutor
from services.google_docs import GoogleDocsService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ClaudeFlow Middleware",
    description="Orchestrate Claude AI → Google Docs pipeline",
    version="1.0.0"
)

# Global services
claude_executor = None
google_docs_service = None


class FlowRequest(BaseModel):
    """Request model for flow execution"""
    flow_name: str = Field(..., description="Name of the flow to execute")
    variables: Dict[str, Any] = Field(default_factory=dict, description="Variables to inject into the flow")
    async_execution: bool = Field(default=False, description="Execute flow asynchronously")
    
    class Config:
        json_schema_extra = {
            "example": {
                "flow_name": "blog_post_generator",
                "variables": {
                    "topic": "AI in Healthcare",
                    "word_count": 1000,
                    "style": "professional"
                },
                "async_execution": False
            }
        }


class FlowResponse(BaseModel):
    """Response model for flow execution"""
    status: str
    flow_id: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str


class FlowManager:
    """Manages flow definitions and execution"""
    
    def __init__(self, flows_dir: str = "flows"):
        self.flows_dir = Path(flows_dir)
        self.flows: Dict[str, Dict] = {}
        self.reload_flows()
    
    def reload_flows(self):
        """Load all YAML flow definitions"""
        self.flows = {}
        
        # Load main claudeflow.yaml
        main_flow_path = Path("claudeflow.yaml")
        if main_flow_path.exists():
            with open(main_flow_path, 'r') as f:
                try:
                    config = yaml.safe_load(f)
                    if 'flows' in config:
                        self.flows.update(config['flows'])
                    logger.info(f"Loaded {len(config.get('flows', {}))} flows from claudeflow.yaml")
                except Exception as e:
                    logger.error(f"Error loading claudeflow.yaml: {e}")
        
        # Load individual flow files
        if self.flows_dir.exists():
            for flow_file in self.flows_dir.glob("*.yaml"):
                with open(flow_file, 'r') as f:
                    try:
                        flow_data = yaml.safe_load(f)
                        flow_name = flow_file.stem
                        self.flows[flow_name] = flow_data
                        logger.info(f"Loaded flow: {flow_name}")
                    except Exception as e:
                        logger.error(f"Error loading flow {flow_file}: {e}")
    
    def get_flow(self, flow_name: str) -> Optional[Dict]:
        """Get flow definition by name"""
        return self.flows.get(flow_name)
    
    async def execute_flow(
        self,
        flow_name: str,
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a flow with given variables"""
        flow = self.get_flow(flow_name)
        if not flow:
            raise ValueError(f"Flow '{flow_name}' not found")
        
        result = {
            "flow_name": flow_name,
            "started_at": datetime.utcnow().isoformat(),
            "steps": []
        }
        
        # Execute each step in the flow
        for step_name, step_config in flow.get('steps', {}).items():
            logger.info(f"Executing step: {step_name}")
            
            step_result = await self._execute_step(
                step_name,
                step_config,
                variables,
                result
            )
            
            result['steps'].append({
                "name": step_name,
                "type": step_config.get('type'),
                "completed_at": datetime.utcnow().isoformat(),
                "result": step_result
            })
            
            # Update variables with step output for next steps
            if isinstance(step_result, dict):
                variables.update(step_result)
        
        result['completed_at'] = datetime.utcnow().isoformat()
        return result
    
    async def _execute_step(
        self,
        step_name: str,
        step_config: Dict[str, Any],
        variables: Dict[str, Any],
        flow_context: Dict[str, Any]
    ) -> Any:
        """Execute a single step in the flow"""
        step_type = step_config.get('type')
        
        if step_type == 'claude':
            return await self._execute_claude_step(step_config, variables)
        elif step_type == 'google_docs':
            return await self._execute_google_docs_step(step_config, variables)
        elif step_type == 'transform':
            return await self._execute_transform_step(step_config, variables)
        else:
            raise ValueError(f"Unknown step type: {step_type}")
    
    async def _execute_claude_step(
        self,
        config: Dict[str, Any],
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Claude API step"""
        if not claude_executor:
            raise RuntimeError("Claude executor not initialized")
        
        # Replace variables in prompt
        prompt_template = config.get('prompt', '')
        prompt = self._replace_variables(prompt_template, variables)
        
        # Execute Claude request
        response = await claude_executor.execute(
            prompt=prompt,
            model=config.get('model', 'claude-3-opus-20240229'),
            max_tokens=config.get('max_tokens', 4096),
            temperature=config.get('temperature', 0.7),
            system_prompt=config.get('system_prompt')
        )
        
        return {
            "claude_response": response,
            "content": response.get('content', ''),
            "usage": response.get('usage', {})
        }
    
    async def _execute_google_docs_step(
        self,
        config: Dict[str, Any],
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute Google Docs step"""
        if not google_docs_service:
            raise RuntimeError("Google Docs service not initialized")
        
        # Get content from variables
        content = variables.get(config.get('content_key', 'content'), '')
        
        # Create or update document
        if config.get('action') == 'create':
            doc_id = await google_docs_service.create_document(
                title=self._replace_variables(config.get('title', 'Untitled'), variables),
                content=content,
                folder_id=config.get('folder_id')
            )
            return {
                "document_id": doc_id,
                "document_url": f"https://docs.google.com/document/d/{doc_id}/edit"
            }
        elif config.get('action') == 'update':
            doc_id = config.get('document_id') or variables.get('document_id')
            if not doc_id:
                raise ValueError("Document ID required for update action")
            
            await google_docs_service.update_document(
                document_id=doc_id,
                content=content,
                append=config.get('append', False)
            )
            return {
                "document_id": doc_id,
                "document_url": f"https://docs.google.com/document/d/{doc_id}/edit"
            }
        else:
            raise ValueError(f"Unknown Google Docs action: {config.get('action')}")
    
    async def _execute_transform_step(
        self,
        config: Dict[str, Any],
        variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute data transformation step"""
        # Simple transformation logic - can be extended
        result = {}
        
        for output_key, transform_config in config.get('transformations', {}).items():
            if transform_config.get('type') == 'extract':
                source_key = transform_config.get('from')
                if source_key and source_key in variables:
                    result[output_key] = variables[source_key]
            elif transform_config.get('type') == 'template':
                template = transform_config.get('template', '')
                result[output_key] = self._replace_variables(template, variables)
        
        return result
    
    def _replace_variables(self, template: str, variables: Dict[str, Any]) -> str:
        """Replace {{variable}} placeholders in template"""
        import re
        
        def replacer(match):
            var_name = match.group(1).strip()
            return str(variables.get(var_name, match.group(0)))
        
        return re.sub(r'\{\{([^}]+)\}\}', replacer, template)


# Initialize flow manager
flow_manager = FlowManager()


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global claude_executor, google_docs_service
    
    try:
        # Initialize Claude executor
        claude_executor = ClaudeExecutor(
            api_key=os.getenv("CLAUDE_API_KEY")
        )
        logger.info("Claude executor initialized")
        
        # Initialize Google Docs service
        google_docs_service = GoogleDocsService(
            credentials_path=os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")
        )
        await google_docs_service.initialize()
        logger.info("Google Docs service initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ClaudeFlow Middleware",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/flows": "List available flows",
            "/run": "Execute a flow",
            "/reload": "Reload flow definitions"
        }
    }


@app.get("/flows")
async def list_flows():
    """List all available flows"""
    flows = []
    for name, flow in flow_manager.flows.items():
        flows.append({
            "name": name,
            "description": flow.get('description', 'No description'),
            "steps": list(flow.get('steps', {}).keys())
        })
    
    return {
        "total": len(flows),
        "flows": flows
    }


@app.post("/run", response_model=FlowResponse)
async def run_flow(request: FlowRequest, background_tasks: BackgroundTasks):
    """Execute a flow"""
    flow_id = f"{request.flow_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        if request.async_execution:
            # Execute asynchronously
            background_tasks.add_task(
                _execute_flow_async,
                flow_id,
                request.flow_name,
                request.variables
            )
            
            return FlowResponse(
                status="started",
                flow_id=flow_id,
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            # Execute synchronously
            result = await flow_manager.execute_flow(
                request.flow_name,
                request.variables
            )
            
            return FlowResponse(
                status="completed",
                flow_id=flow_id,
                result=result,
                timestamp=datetime.utcnow().isoformat()
            )
            
    except Exception as e:
        logger.error(f"Flow execution failed: {e}")
        return FlowResponse(
            status="failed",
            flow_id=flow_id,
            error=str(e),
            timestamp=datetime.utcnow().isoformat()
        )


async def _execute_flow_async(flow_id: str, flow_name: str, variables: Dict[str, Any]):
    """Execute flow asynchronously"""
    try:
        result = await flow_manager.execute_flow(flow_name, variables)
        logger.info(f"Flow {flow_id} completed successfully")
        # In production, store result in database or cache
    except Exception as e:
        logger.error(f"Flow {flow_id} failed: {e}")
        # In production, store error in database or send notification


@app.post("/reload")
async def reload_flows():
    """Reload flow definitions"""
    try:
        flow_manager.reload_flows()
        return {
            "status": "success",
            "message": "Flows reloaded successfully",
            "total_flows": len(flow_manager.flows)
        }
    except Exception as e:
        logger.error(f"Failed to reload flows: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "claude": "ready" if claude_executor else "not initialized",
            "google_docs": "ready" if google_docs_service else "not initialized"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)