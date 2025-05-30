"""
Google Docs Service
Handles Google Docs API integration with OAuth2 service account authentication
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import aiofiles

logger = logging.getLogger(__name__)


class GoogleDocsService:
    """Google Docs API service with async support"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive'
    ]
    
    def __init__(self, credentials_path: Optional[str] = None):
        self.credentials_path = credentials_path or os.getenv("GOOGLE_CREDENTIALS_PATH")
        if not self.credentials_path:
            raise ValueError("Google credentials path not provided")
        
        self.credentials = None
        self.docs_service = None
        self.drive_service = None
        self._executor = None
    
    async def initialize(self):
        """Initialize Google services"""
        try:
            # Load credentials
            if not os.path.exists(self.credentials_path):
                raise FileNotFoundError(f"Credentials file not found: {self.credentials_path}")
            
            self.credentials = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=self.SCOPES
            )
            
            # Build services
            self.docs_service = build('docs', 'v1', credentials=self.credentials)
            self.drive_service = build('drive', 'v3', credentials=self.credentials)
            
            # Create thread pool executor for blocking calls
            import concurrent.futures
            self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=5)
            
            logger.info("Google services initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Google services: {e}")
            raise
    
    async def create_document(
        self,
        title: str,
        content: str,
        folder_id: Optional[str] = None
    ) -> str:
        """
        Create a new Google Doc with content
        
        Args:
            title: Document title
            content: Document content (can be plain text or markdown)
            folder_id: Optional Google Drive folder ID
            
        Returns:
            Document ID
        """
        try:
            # Create document
            document = {
                'title': title
            }
            
            # Execute in thread pool
            loop = asyncio.get_event_loop()
            doc = await loop.run_in_executor(
                self._executor,
                self.docs_service.documents().create(body=document).execute
            )
            
            doc_id = doc['documentId']
            logger.info(f"Created document: {doc_id}")
            
            # Move to folder if specified
            if folder_id:
                await self._move_to_folder(doc_id, folder_id)
            
            # Add content
            if content:
                await self.update_document(doc_id, content, append=False)
            
            return doc_id
            
        except Exception as e:
            logger.error(f"Failed to create document: {e}")
            raise
    
    async def update_document(
        self,
        document_id: str,
        content: str,
        append: bool = True
    ):
        """
        Update existing document with content
        
        Args:
            document_id: Google Doc ID
            content: Content to add
            append: Whether to append or replace content
        """
        try:
            # Get current document if appending
            if append:
                loop = asyncio.get_event_loop()
                doc = await loop.run_in_executor(
                    self._executor,
                    self.docs_service.documents().get(documentId=document_id).execute
                )
                
                # Find end index
                end_index = 1
                if 'body' in doc and 'content' in doc['body']:
                    for element in doc['body']['content']:
                        if 'paragraph' in element:
                            end_index = element['endIndex']
            else:
                end_index = 1
            
            # Parse content and create requests
            requests = self._parse_content_to_requests(content, start_index=end_index if append else 1)
            
            # If replacing, first delete existing content
            if not append:
                delete_request = {
                    'deleteContentRange': {
                        'range': {
                            'startIndex': 1,
                            'endIndex': end_index - 1
                        }
                    }
                }
                requests.insert(0, delete_request)
            
            # Execute batch update
            if requests:
                body = {'requests': requests}
                
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    self._executor,
                    self.docs_service.documents().batchUpdate(
                        documentId=document_id,
                        body=body
                    ).execute
                )
                
                logger.info(f"Updated document: {document_id}")
                
        except Exception as e:
            logger.error(f"Failed to update document: {e}")
            raise
    
    def _parse_content_to_requests(
        self,
        content: str,
        start_index: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Parse content (markdown or plain text) to Google Docs API requests
        
        Args:
            content: Content to parse
            start_index: Starting index for insertion
            
        Returns:
            List of Google Docs API requests
        """
        requests = []
        current_index = start_index
        
        # Split content into lines for basic formatting
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            
            if not line:
                # Empty line - add paragraph break
                requests.append({
                    'insertText': {
                        'location': {'index': current_index},
                        'text': '\n'
                    }
                })
                current_index += 1
                continue
            
            # Check for markdown-style headers
            if line.startswith('#'):
                level = len(line) - len(line.lstrip('#'))
                text = line.lstrip('#').strip()
                
                # Insert text
                requests.append({
                    'insertText': {
                        'location': {'index': current_index},
                        'text': text + '\n'
                    }
                })
                
                # Apply heading style
                requests.append({
                    'updateParagraphStyle': {
                        'range': {
                            'startIndex': current_index,
                            'endIndex': current_index + len(text) + 1
                        },
                        'paragraphStyle': {
                            'namedStyleType': f'HEADING_{min(level, 6)}'
                        },
                        'fields': 'namedStyleType'
                    }
                })
                
                current_index += len(text) + 1
                
            # Check for bold text (**text**)
            elif '**' in line:
                import re
                parts = re.split(r'\*\*(.*?)\*\*', line)
                
                for i, part in enumerate(parts):
                    if part:
                        # Insert text
                        requests.append({
                            'insertText': {
                                'location': {'index': current_index},
                                'text': part
                            }
                        })
                        
                        # Apply bold style to every other part (the ones between **)
                        if i % 2 == 1:
                            requests.append({
                                'updateTextStyle': {
                                    'range': {
                                        'startIndex': current_index,
                                        'endIndex': current_index + len(part)
                                    },
                                    'textStyle': {
                                        'bold': True
                                    },
                                    'fields': 'bold'
                                }
                            })
                        
                        current_index += len(part)
                
                # Add newline
                requests.append({
                    'insertText': {
                        'location': {'index': current_index},
                        'text': '\n'
                    }
                })
                current_index += 1
                
            # Check for bullet points
            elif line.startswith('- ') or line.startswith('* '):
                text = line[2:]
                
                # Insert text
                requests.append({
                    'insertText': {
                        'location': {'index': current_index},
                        'text': text + '\n'
                    }
                })
                
                # Create bullet
                requests.append({
                    'createParagraphBullets': {
                        'range': {
                            'startIndex': current_index,
                            'endIndex': current_index + len(text) + 1
                        },
                        'bulletPreset': 'BULLET_DISC_CIRCLE_SQUARE'
                    }
                })
                
                current_index += len(text) + 1
                
            else:
                # Regular text
                requests.append({
                    'insertText': {
                        'location': {'index': current_index},
                        'text': line + '\n'
                    }
                })
                current_index += len(line) + 1
        
        return requests
    
    async def _move_to_folder(self, file_id: str, folder_id: str):
        """Move file to specific folder"""
        try:
            # Get current parents
            loop = asyncio.get_event_loop()
            file = await loop.run_in_executor(
                self._executor,
                self.drive_service.files().get(
                    fileId=file_id,
                    fields='parents'
                ).execute
            )
            
            # Remove from current parents
            previous_parents = ",".join(file.get('parents', []))
            
            # Move to new folder
            await loop.run_in_executor(
                self._executor,
                self.drive_service.files().update(
                    fileId=file_id,
                    addParents=folder_id,
                    removeParents=previous_parents,
                    fields='id, parents'
                ).execute
            )
            
            logger.info(f"Moved document {file_id} to folder {folder_id}")
            
        except Exception as e:
            logger.error(f"Failed to move file to folder: {e}")
            # Non-critical error, don't raise
    
    async def get_document(self, document_id: str) -> Dict[str, Any]:
        """Get document content and metadata"""
        try:
            loop = asyncio.get_event_loop()
            doc = await loop.run_in_executor(
                self._executor,
                self.docs_service.documents().get(documentId=document_id).execute
            )
            
            return doc
            
        except Exception as e:
            logger.error(f"Failed to get document: {e}")
            raise
    
    async def export_document(
        self,
        document_id: str,
        format: str = 'text/plain'
    ) -> str:
        """
        Export document in specified format
        
        Args:
            document_id: Google Doc ID
            format: Export format (text/plain, text/html, application/pdf, etc.)
            
        Returns:
            Exported content
        """
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self._executor,
                self.drive_service.files().export(
                    fileId=document_id,
                    mimeType=format
                ).execute
            )
            
            return result.decode('utf-8') if isinstance(result, bytes) else result
            
        except Exception as e:
            logger.error(f"Failed to export document: {e}")
            raise
    
    async def share_document(
        self,
        document_id: str,
        email: str,
        role: str = 'reader',
        send_notification: bool = True
    ):
        """
        Share document with specific user
        
        Args:
            document_id: Google Doc ID
            email: Email address to share with
            role: Permission role (reader, writer, commenter)
            send_notification: Whether to send email notification
        """
        try:
            permission = {
                'type': 'user',
                'role': role,
                'emailAddress': email
            }
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self._executor,
                self.drive_service.permissions().create(
                    fileId=document_id,
                    body=permission,
                    sendNotificationEmail=send_notification
                ).execute
            )
            
            logger.info(f"Shared document {document_id} with {email}")
            
        except Exception as e:
            logger.error(f"Failed to share document: {e}")
            raise
    
    async def create_from_template(
        self,
        template_id: str,
        title: str,
        replacements: Dict[str, str],
        folder_id: Optional[str] = None
    ) -> str:
        """
        Create document from template with variable replacements
        
        Args:
            template_id: Template document ID
            title: New document title
            replacements: Dictionary of text replacements
            folder_id: Optional folder ID
            
        Returns:
            New document ID
        """
        try:
            # Copy template
            copy_body = {
                'name': title
            }
            
            loop = asyncio.get_event_loop()
            copy = await loop.run_in_executor(
                self._executor,
                self.drive_service.files().copy(
                    fileId=template_id,
                    body=copy_body
                ).execute
            )
            
            new_doc_id = copy['id']
            
            # Move to folder if specified
            if folder_id:
                await self._move_to_folder(new_doc_id, folder_id)
            
            # Perform replacements
            if replacements:
                requests = []
                for old_text, new_text in replacements.items():
                    requests.append({
                        'replaceAllText': {
                            'containsText': {
                                'text': old_text,
                                'matchCase': True
                            },
                            'replaceText': new_text
                        }
                    })
                
                if requests:
                    body = {'requests': requests}
                    await loop.run_in_executor(
                        self._executor,
                        self.docs_service.documents().batchUpdate(
                            documentId=new_doc_id,
                            body=body
                        ).execute
                    )
            
            logger.info(f"Created document from template: {new_doc_id}")
            return new_doc_id
            
        except Exception as e:
            logger.error(f"Failed to create from template: {e}")
            raise
    
    def close(self):
        """Close executor"""
        if self._executor:
            self._executor.shutdown(wait=True)