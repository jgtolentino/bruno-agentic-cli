"""
Claude API Executor Service
Handles async Claude API integration with template variable replacement
"""

import os
import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class ClaudeExecutor:
    """Async Claude API executor with template support"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("CLAUDE_API_KEY")
        if not self.api_key:
            raise ValueError("Claude API key not provided")
        
        self.base_url = "https://api.anthropic.com/v1"
        self.headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def execute(
        self,
        prompt: str,
        model: str = "claude-3-opus-20240229",
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        stop_sequences: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute Claude API request with retry logic
        
        Args:
            prompt: The user prompt
            model: Claude model to use
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0-1)
            system_prompt: Optional system prompt
            stop_sequences: Optional stop sequences
            metadata: Optional metadata for logging
            
        Returns:
            Dict containing response content and metadata
        """
        session = self._get_session()
        
        # Build messages
        messages = []
        if system_prompt:
            messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        # Build request payload
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        if stop_sequences:
            payload["stop_sequences"] = stop_sequences
        
        # Log request
        logger.info(f"Executing Claude request with model: {model}")
        if metadata:
            logger.info(f"Request metadata: {metadata}")
        
        start_time = datetime.utcnow()
        
        try:
            async with session.post(
                f"{self.base_url}/messages",
                headers=self.headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    error_msg = response_data.get('error', {}).get('message', 'Unknown error')
                    raise Exception(f"Claude API error ({response.status}): {error_msg}")
                
                # Calculate execution time
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                # Extract content
                content = ""
                if response_data.get('content'):
                    content = response_data['content'][0].get('text', '')
                
                result = {
                    "content": content,
                    "model": model,
                    "usage": response_data.get('usage', {}),
                    "stop_reason": response_data.get('stop_reason'),
                    "execution_time": execution_time,
                    "metadata": metadata or {}
                }
                
                logger.info(
                    f"Claude request completed in {execution_time:.2f}s, "
                    f"tokens: {result['usage'].get('total_tokens', 0)}"
                )
                
                return result
                
        except asyncio.TimeoutError:
            logger.error("Claude API request timed out")
            raise Exception("Claude API request timed out after 120 seconds")
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise
    
    async def execute_batch(
        self,
        prompts: List[Dict[str, Any]],
        max_concurrent: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Execute multiple Claude requests concurrently
        
        Args:
            prompts: List of prompt configurations
            max_concurrent: Maximum concurrent requests
            
        Returns:
            List of results in same order as prompts
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def execute_with_semaphore(prompt_config: Dict[str, Any], index: int):
            async with semaphore:
                try:
                    result = await self.execute(**prompt_config)
                    return (index, result)
                except Exception as e:
                    logger.error(f"Batch request {index} failed: {e}")
                    return (index, {"error": str(e)})
        
        # Execute all requests concurrently
        tasks = [
            execute_with_semaphore(prompt_config, i)
            for i, prompt_config in enumerate(prompts)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Sort results by original index
        results.sort(key=lambda x: x[0])
        
        return [result[1] for result in results]
    
    async def stream_execute(
        self,
        prompt: str,
        model: str = "claude-3-opus-20240229",
        max_tokens: int = 4096,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
        on_chunk=None
    ):
        """
        Execute Claude API request with streaming response
        
        Args:
            prompt: The user prompt
            model: Claude model to use
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            system_prompt: Optional system prompt
            on_chunk: Callback function for each chunk
        """
        session = self._get_session()
        
        # Build messages
        messages = []
        if system_prompt:
            messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        # Build request payload with streaming enabled
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        
        full_content = ""
        
        try:
            async with session.post(
                f"{self.base_url}/messages",
                headers=self.headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=120)
            ) as response:
                if response.status != 200:
                    error_data = await response.json()
                    error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                    raise Exception(f"Claude API error ({response.status}): {error_msg}")
                
                async for line in response.content:
                    if line:
                        try:
                            # Parse SSE data
                            line_str = line.decode('utf-8').strip()
                            if line_str.startswith('data: '):
                                data_str = line_str[6:]
                                if data_str == '[DONE]':
                                    break
                                
                                data = json.loads(data_str)
                                if data.get('type') == 'content_block_delta':
                                    chunk = data.get('delta', {}).get('text', '')
                                    full_content += chunk
                                    
                                    if on_chunk:
                                        await on_chunk(chunk)
                        except Exception as e:
                            logger.warning(f"Error parsing stream chunk: {e}")
                
                return {
                    "content": full_content,
                    "model": model,
                    "stream": True
                }
                
        except Exception as e:
            logger.error(f"Claude streaming error: {e}")
            raise
    
    def validate_prompt(self, prompt: str, max_length: int = 100000) -> bool:
        """
        Validate prompt before sending to API
        
        Args:
            prompt: Prompt to validate
            max_length: Maximum allowed prompt length
            
        Returns:
            True if valid, raises exception if not
        """
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        if len(prompt) > max_length:
            raise ValueError(f"Prompt exceeds maximum length of {max_length} characters")
        
        return True
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None


class ClaudeTemplate:
    """Template system for Claude prompts"""
    
    def __init__(self, template: str):
        self.template = template
        self._validate_template()
    
    def _validate_template(self):
        """Validate template syntax"""
        import re
        
        # Check for balanced braces
        open_braces = self.template.count('{{')
        close_braces = self.template.count('}}')
        
        if open_braces != close_braces:
            raise ValueError("Template has unbalanced braces")
        
        # Check for valid variable names
        pattern = r'\{\{([^}]+)\}\}'
        matches = re.findall(pattern, self.template)
        
        for var_name in matches:
            if not var_name.strip():
                raise ValueError("Empty variable name in template")
    
    def render(self, variables: Dict[str, Any]) -> str:
        """
        Render template with variables
        
        Args:
            variables: Dictionary of variable values
            
        Returns:
            Rendered template string
        """
        import re
        
        def replacer(match):
            var_name = match.group(1).strip()
            
            # Handle nested attributes (e.g., {{user.name}})
            parts = var_name.split('.')
            value = variables
            
            for part in parts:
                if isinstance(value, dict):
                    value = value.get(part, f"{{{{ {var_name} }}}}")
                else:
                    return f"{{{{ {var_name} }}}}"
            
            return str(value)
        
        return re.sub(r'\{\{([^}]+)\}\}', replacer, self.template)
    
    def get_variables(self) -> List[str]:
        """Get list of variables in template"""
        import re
        
        pattern = r'\{\{([^}]+)\}\}'
        matches = re.findall(pattern, self.template)
        
        return [match.strip() for match in matches]