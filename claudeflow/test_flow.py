#!/usr/bin/env python3
"""
ClaudeFlow Test Script
Test the ClaudeFlow API with sample requests
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any


class ClaudeFlowTester:
    """Test client for ClaudeFlow API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def health_check(self):
        """Test server health"""
        print("🔍 Checking server health...")
        
        try:
            async with self.session.get(f"{self.base_url}/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print("✅ Server is healthy")
                    print(f"   Services: {data.get('services', {})}")
                    return True
                else:
                    print(f"❌ Health check failed with status {resp.status}")
                    return False
        except Exception as e:
            print(f"❌ Cannot connect to server: {e}")
            return False
    
    async def list_flows(self):
        """List available flows"""
        print("\n📋 Listing available flows...")
        
        try:
            async with self.session.get(f"{self.base_url}/flows") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    flows = data.get('flows', [])
                    print(f"✅ Found {len(flows)} flows:")
                    
                    for flow in flows:
                        print(f"   📄 {flow['name']}: {flow['description']}")
                        if flow.get('steps'):
                            print(f"      Steps: {', '.join(flow['steps'])}")
                    
                    return flows
                else:
                    print(f"❌ Failed to list flows: {resp.status}")
                    return []
        except Exception as e:
            print(f"❌ Error listing flows: {e}")
            return []
    
    async def test_simple_flow(self):
        """Test a simple flow execution"""
        print("\n🧪 Testing simple blog post generation...")
        
        flow_request = {
            "flow_name": "blog_post_generator",
            "variables": {
                "topic": "The Future of AI in Software Development",
                "word_count": 500,
                "style": "professional",
                "audience": "software developers and tech professionals"
            }
        }
        
        return await self._run_flow(flow_request)
    
    async def test_meeting_summary(self):
        """Test meeting summary flow"""
        print("\n🧪 Testing meeting summary flow...")
        
        sample_notes = """
        Attendees discussed Q1 goals and budget allocation.
        
        Key points:
        - Marketing budget increased by 15%
        - New product launch scheduled for March
        - Hiring 3 new developers
        - Remote work policy updated
        
        Action items:
        - John to finalize marketing strategy by Friday
        - Sarah to post job listings for developers
        - Mike to update employee handbook
        
        Next meeting: February 15th to review progress
        """
        
        flow_request = {
            "flow_name": "meeting_summary_flow",
            "variables": {
                "meeting_notes": sample_notes,
                "meeting_title": "Q1 Planning Session",
                "attendees": "John (CEO), Sarah (HR), Mike (CTO), Lisa (Marketing)",
                "date": "2024-01-15"
            }
        }
        
        return await self._run_flow(flow_request)
    
    async def test_async_flow(self):
        """Test asynchronous flow execution"""
        print("\n🧪 Testing async flow execution...")
        
        flow_request = {
            "flow_name": "content_research_and_write",
            "variables": {
                "research_topic": "Sustainable Energy Technologies",
                "content_type": "comprehensive guide",
                "depth": "intermediate"
            },
            "async_execution": True
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/run",
                json=flow_request
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"✅ Async flow started: {data.get('flow_id')}")
                    print(f"   Status: {data.get('status')}")
                    return data
                else:
                    error_data = await resp.json()
                    print(f"❌ Async flow failed: {error_data}")
                    return None
        except Exception as e:
            print(f"❌ Error running async flow: {e}")
            return None
    
    async def _run_flow(self, flow_request: Dict[str, Any]):
        """Execute a flow and return result"""
        start_time = time.time()
        
        try:
            async with self.session.post(
                f"{self.base_url}/run",
                json=flow_request
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    execution_time = time.time() - start_time
                    
                    print(f"✅ Flow completed in {execution_time:.2f}s")
                    print(f"   Flow ID: {data.get('flow_id')}")
                    print(f"   Status: {data.get('status')}")
                    
                    # Print result summary
                    result = data.get('result', {})
                    if result:
                        steps = result.get('steps', [])
                        print(f"   Steps executed: {len(steps)}")
                        
                        for step in steps:
                            step_name = step.get('name')
                            step_type = step.get('type')
                            print(f"     • {step_name} ({step_type})")
                    
                    return data
                else:
                    error_data = await resp.json()
                    print(f"❌ Flow failed with status {resp.status}")
                    print(f"   Error: {error_data.get('error', 'Unknown error')}")
                    return None
        except Exception as e:
            print(f"❌ Error executing flow: {e}")
            return None
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🚀 ClaudeFlow API Tests")
        print("=" * 50)
        
        # Health check
        if not await self.health_check():
            print("❌ Server not available, stopping tests")
            return
        
        # List flows
        flows = await self.list_flows()
        if not flows:
            print("❌ No flows available, stopping tests")
            return
        
        # Test flows if they exist
        available_flow_names = [f['name'] for f in flows]
        
        if "blog_post_generator" in available_flow_names:
            await self.test_simple_flow()
        else:
            print("\n⚠️  Skipping blog post test - flow not available")
        
        if "meeting_summary_flow" in available_flow_names:
            await self.test_meeting_summary()
        else:
            print("\n⚠️  Skipping meeting summary test - flow not available")
        
        if "content_research_and_write" in available_flow_names:
            await self.test_async_flow()
        else:
            print("\n⚠️  Skipping async test - flow not available")
        
        print("\n✅ All tests completed!")


async def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test ClaudeFlow API")
    parser.add_argument(
        "--url", 
        default="http://localhost:8000",
        help="ClaudeFlow server URL"
    )
    parser.add_argument(
        "--test",
        choices=["health", "flows", "blog", "meeting", "async", "all"],
        default="all",
        help="Specific test to run"
    )
    
    args = parser.parse_args()
    
    async with ClaudeFlowTester(args.url) as tester:
        if args.test == "health":
            await tester.health_check()
        elif args.test == "flows":
            await tester.list_flows()
        elif args.test == "blog":
            await tester.test_simple_flow()
        elif args.test == "meeting":
            await tester.test_meeting_summary()
        elif args.test == "async":
            await tester.test_async_flow()
        else:
            await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())