"""Test configuration loading."""

import sys
from pathlib import Path

# Add docinfo to path
sys.path.insert(0, str(Path(__file__).parent))

from autoglean.core.config import get_config_loader
from autoglean.extractors.document import get_document_extractor

def test_config():
    """Test configuration loading."""
    print("=" * 60)
    print("Testing DocuInfo Configuration")
    print("=" * 60)

    try:
        # Load config
        config_loader = get_config_loader()

        # Test app config
        print("\n✓ Loading app.yaml...")
        app_config = config_loader.load_app_config()
        print(f"  App name: {app_config['application']['name']}")
        print(f"  Version: {app_config['application']['version']}")

        # Test LLM config
        print("\n✓ Loading llm.yaml...")
        llm_config = config_loader.load_llm_config()
        providers = llm_config['providers']
        print(f"  Available providers: {', '.join(providers.keys())}")
        print(f"  Default model: {llm_config['default_model']}")

        # Test extractors config
        print("\n✓ Loading extractors.yaml...")
        extractors_config = config_loader.load_extractors_config()
        extractors = extractors_config['extractors']
        print(f"  Available extractors: {', '.join(extractors.keys())}")

        # Test API config
        print("\n✓ Loading api.yaml...")
        api_config = config_loader.load_api_config()
        print(f"  API port: {api_config['api']['port']}")
        print(f"  API host: {api_config['api']['host']}")

        # Test document extractor
        print("\n✓ Initializing DocumentExtractor...")
        extractor = get_document_extractor()
        all_extractors = extractor.list_extractors()
        print(f"  Loaded {len(all_extractors)} extractors")

        for ext_id, ext_config in all_extractors.items():
            print(f"    - {ext_config['name']} ({ext_id})")

        print("\n" + "=" * 60)
        print("✅ All configuration tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Configuration test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_config()
