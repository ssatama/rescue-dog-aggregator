# Security Testing Guide

This document covers security testing methodologies, vulnerability assessment procedures, and security validation strategies for the Rescue Dog Aggregator platform.

## Security Overview

The platform implements comprehensive security measures across frontend and backend:

**Frontend Security:**
- XSS prevention with custom sanitization utilities
- Content Security Policy (CSP) headers
- URL validation for external links
- HTML/text sanitization for user content

**Backend Security:**
- Input validation with Pydantic models and validators
- SQL injection prevention with parameterized queries
- Request parameter validation and limits
- Type validation for numeric parameters

## XSS Prevention Testing

### Frontend Content Sanitization

**HTML Sanitization Testing:**
```javascript
import { sanitizeHtml, sanitizeText, validateUrl } from '../utils/security';

describe('XSS Prevention', () => {
  test('removes script tags and dangerous content', () => {
    const maliciousInput = '<p>Hello</p><script>alert("xss")</script>';
    const sanitized = sanitizeHtml(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('<p>Hello</p>');
  });

  test('removes dangerous event handlers', () => {
    const input = '<img src="test.jpg" onload="alert(\'xss\')" alt="test">';
    const result = sanitizeHtml(input);
    
    expect(result).not.toContain('onload');
    expect(result).not.toContain('alert');
    expect(result).toContain('src="test.jpg"');
  });

  test('escapes HTML entities in text content', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeText(input);
    
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
```

**URL Validation Testing:**
```javascript
describe('URL Security', () => {
  test('allows safe HTTP/HTTPS URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://example.com')).toBe(true);
  });

  test('blocks javascript: URLs', () => {
    expect(validateUrl('javascript:alert("xss")')).toBe(false);
    expect(validateUrl('JAVASCRIPT:alert("xss")')).toBe(false);
  });

  test('blocks data: URLs with scripts', () => {
    expect(validateUrl('data:text/html,<script>alert("xss")</script>')).toBe(false);
  });

  test('blocks dangerous protocols', () => {
    expect(validateUrl('vbscript:msgbox("xss")')).toBe(false);
    expect(validateUrl('file:///etc/passwd')).toBe(false);
  });
});
```

### Content Security Policy Testing

**CSP Header Generation:**
```javascript
import { generateCSPHeader, CSP_DIRECTIVES } from '../utils/security';

describe('Content Security Policy', () => {
  test('generates valid CSP header', () => {
    const cspHeader = generateCSPHeader();
    
    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain("object-src 'none'");
    expect(cspHeader).toContain("frame-src 'none'");
    expect(cspHeader).toContain("base-uri 'self'");
  });

  test('restricts dangerous sources', () => {
    expect(CSP_DIRECTIVES.frameSrc).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES.objectSrc).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES.baseUri).toEqual(["'self'"]);
  });
});
```

## Input Validation Testing

### Backend API Validation

**SQL Injection Prevention:**
```python
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

@pytest.mark.security
class TestSQLInjection:
    """Test SQL injection prevention across all endpoints."""
    
    def test_animals_endpoint_sql_injection_prevention(self):
        """Test that animals endpoint prevents SQL injection."""
        injection_attempts = [
            "'; DROP TABLE animals; --",
            "1' OR '1'='1",
            "' UNION SELECT * FROM organizations --",
            "1; DELETE FROM animals; --",
            "admin'--",
            "' OR 1=1 --"
        ]
        
        for injection in injection_attempts:
            # Test search parameter
            response = client.get(f"/api/animals?search={injection}")
            assert response.status_code in [200, 422]
            
            # Test breed parameter
            response = client.get(f"/api/animals?breed={injection}")
            assert response.status_code in [200, 422]
            
            # If successful, verify no sensitive data leaked
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list)
                # Ensure response is reasonable size (not entire DB)
                assert len(data) <= 100
```

**Parameter Validation Testing:**
```python
@pytest.mark.security
class TestInputValidation:
    """Test comprehensive input validation."""
    
    def test_parameter_limits_enforcement(self):
        """Test that parameter limits are enforced."""
        # Test limit parameter validation
        response = client.get("/api/animals?limit=0")
        assert response.status_code == 422  # Should reject invalid limit
        
        response = client.get("/api/animals?limit=1000")
        assert response.status_code == 422  # Should reject excessive limit
        
        response = client.get("/api/animals?limit=50")
        assert response.status_code == 200  # Should accept valid limit
    
    def test_negative_parameter_rejection(self):
        """Test rejection of negative values."""
        response = client.get("/api/animals?limit=-1")
        assert response.status_code == 422
        
        response = client.get("/api/animals?offset=-1")
        assert response.status_code == 422
    
    def test_type_validation(self):
        """Test numeric parameter type validation."""
        response = client.get("/api/organizations/not_a_number")
        assert response.status_code == 422
        
        response = client.get("/api/animals/not_a_number")
        assert response.status_code == 422
```

### Pydantic Model Validation

**Request Model Security Testing:**
```python
from api.models.requests import AnimalFilterRequest
import pytest

@pytest.mark.unit
class TestRequestValidation:
    """Test Pydantic model validation security."""
    
    def test_limit_constraints(self):
        """Test limit parameter constraints."""
        # Valid limits
        assert AnimalFilterRequest(limit=1).limit == 1
        assert AnimalFilterRequest(limit=100).limit == 100
        
        # Invalid limits should raise validation error
        with pytest.raises(ValueError):
            AnimalFilterRequest(limit=0)
        with pytest.raises(ValueError):
            AnimalFilterRequest(limit=101)
        with pytest.raises(ValueError):
            AnimalFilterRequest(limit=-1)
    
    def test_status_validation(self):
        """Test status field validation."""
        # Valid statuses
        assert AnimalFilterRequest(status="available").status == "available"
        assert AnimalFilterRequest(status="all").status == "all"
        
        # Invalid status should raise validation error
        with pytest.raises(ValueError):
            AnimalFilterRequest(status="invalid_status")
    
    def test_search_sanitization(self):
        """Test search parameter handling."""
        # Normal search
        request = AnimalFilterRequest(search="golden retriever")
        assert request.search == "golden retriever"
        
        # SQL injection attempt (should be handled safely)
        request = AnimalFilterRequest(search="'; DROP TABLE animals; --")
        assert request.search == "'; DROP TABLE animals; --"  # Stored but will be parameterized
```

## Vulnerability Assessment

### Automated Security Scanning

**Dependency Vulnerability Testing:**
```bash
# Backend dependency scanning
pip-audit --desc --format=json --output=security-report.json

# Frontend dependency scanning  
npm audit --audit-level=moderate --json > npm-security-report.json

# Check for high/critical vulnerabilities
npm audit --audit-level=high
```

**Security Test Markers:**
```python
# pytest configuration for security tests
@pytest.mark.security
@pytest.mark.slow
def test_comprehensive_sql_injection():
    """Comprehensive SQL injection testing."""
    pass

@pytest.mark.security
@pytest.mark.fast
def test_input_validation():
    """Fast input validation tests."""
    pass
```

### Penetration Testing Procedures

**Manual Security Testing Checklist:**

1. **Input Validation Testing:**
   - Test all form inputs with malicious payloads
   - Verify parameter limits and type validation
   - Test special characters and encoding

2. **XSS Testing:**
   - Test stored XSS in user-generated content
   - Test reflected XSS in URL parameters
   - Verify CSP headers block inline scripts

3. **SQL Injection Testing:**
   - Test all database query endpoints
   - Verify parameterized queries prevent injection
   - Test edge cases and malformed inputs

4. **Authentication/Authorization:**
   - Test access controls (when implemented)
   - Verify session management security
   - Test privilege escalation attempts

## Security Regression Testing

### Automated Security Tests in CI/CD

**Security Test Pipeline:**
```yaml
# .github/workflows/security.yml (conceptual)
name: Security Testing

on:
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Backend Security Tests
        run: |
          source venv/bin/activate
          pytest tests/security/ -v
          pytest -m "security" -v
          
      - name: Frontend Security Tests
        run: |
          cd frontend
          npm test -- --testPathPattern=security
          
      - name: Dependency Audit
        run: |
          pip-audit --desc
          cd frontend && npm audit --audit-level=moderate
```

### Security Monitoring Integration

**Runtime Security Monitoring:**
```python
# API middleware for security monitoring
import logging
from fastapi import Request

security_logger = logging.getLogger('security')

async def security_middleware(request: Request, call_next):
    """Monitor requests for suspicious patterns."""
    
    # Check for suspicious patterns in parameters
    query_params = str(request.query_params)
    suspicious_patterns = [
        'DROP TABLE',
        'UNION SELECT',
        '<script',
        'javascript:',
        'onload=',
        'eval(',
    ]
    
    for pattern in suspicious_patterns:
        if pattern.lower() in query_params.lower():
            security_logger.warning(
                f"Suspicious request pattern detected: {pattern} "
                f"from IP: {request.client.host} "
                f"URL: {request.url}"
            )
    
    response = await call_next(request)
    return response
```

## Security Testing Best Practices

### Test Development Guidelines

1. **Comprehensive Coverage**: Test all input vectors and endpoints
2. **Realistic Payloads**: Use real-world attack patterns
3. **Edge Cases**: Test boundary conditions and malformed inputs
4. **Automation**: Integrate security tests into CI/CD pipeline
5. **Regular Updates**: Keep attack patterns and tests current

### Security Test Categories

**Unit Tests (Fast):**
- Input validation functions
- Sanitization utility functions
- Pydantic model constraints
- CSP header generation

**Integration Tests (Medium):**
- API endpoint security validation
- Database query injection prevention
- Frontend component XSS protection
- URL validation in components

**End-to-End Tests (Slow):**
- Full application security flows
- Browser-based XSS testing
- Complete injection attack scenarios
- Real user input validation

### Security Testing Tools

**Static Analysis:**
- `bandit` for Python security linting
- `eslint-plugin-security` for JavaScript
- `semgrep` for pattern-based security scanning

**Dynamic Testing:**
- Custom SQL injection test suites
- XSS payload testing frameworks
- Automated parameter fuzzing
- Browser-based security testing

**Dependency Scanning:**
- `pip-audit` for Python dependencies
- `npm audit` for Node.js dependencies
- GitHub Dependabot alerts
- Regular security update reviews

## Incident Response Testing

### Security Incident Simulation

**Test Scenarios:**
1. **SQL Injection Attempt**: Verify logging and blocking
2. **XSS Attack**: Test sanitization and CSP effectiveness
3. **Malicious File Upload**: Verify file type validation
4. **DoS Attempt**: Test rate limiting and resource protection

**Response Validation:**
- Verify attack detection and logging
- Test automated blocking mechanisms
- Validate security alert generation
- Ensure proper incident documentation

This comprehensive security testing strategy ensures robust protection against common web application vulnerabilities while maintaining usability and performance.