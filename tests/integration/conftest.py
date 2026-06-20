import pytest
from gltest import get_contract_factory, create_account


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks tests as slow (requires LLM consensus)")


@pytest.fixture(scope="module")
def deployer():
    return create_account()


@pytest.fixture(scope="module")
def backer_a():
    return create_account()


@pytest.fixture(scope="module")
def backer_b():
    return create_account()


@pytest.fixture(scope="module")
def outsider():
    return create_account()


@pytest.fixture(scope="module")
def contract(deployer):
    factory = get_contract_factory("KindlingCampaign")
    return factory.deploy(args=[], account=deployer)
