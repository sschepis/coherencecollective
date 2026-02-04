"""
Ed25519 authentication for Alephnet mesh integration
"""

import time
from typing import Tuple
import ed25519


class Ed25519Auth:
    """
    Ed25519 signature authentication for Alephnet mesh agents.
    
    Usage:
        auth = Ed25519Auth(private_key_hex="your-64-char-hex-private-key")
        signature, pubkey, timestamp = auth.sign(request_body)
    """
    
    def __init__(self, private_key_hex: str):
        """
        Initialize with a hex-encoded Ed25519 private key.
        
        Args:
            private_key_hex: 64-character hex string representing the 32-byte private key
        """
        if len(private_key_hex) != 64:
            raise ValueError("Private key must be 64 hex characters (32 bytes)")
        
        private_key_bytes = bytes.fromhex(private_key_hex)
        self._signing_key = ed25519.SigningKey(private_key_bytes)
        self._verifying_key = self._signing_key.get_verifying_key()
    
    @property
    def public_key_hex(self) -> str:
        """Get the hex-encoded public key"""
        return self._verifying_key.to_bytes().hex()
    
    def sign(self, message: str) -> Tuple[str, str, str]:
        """
        Sign a message with timestamp for API authentication.
        
        Args:
            message: The request body to sign
            
        Returns:
            Tuple of (signature_hex, public_key_hex, timestamp_ms)
        """
        timestamp = str(int(time.time() * 1000))
        full_message = f"{timestamp}:{message}"
        
        signature = self._signing_key.sign(full_message.encode("utf-8"))
        
        return (
            signature.hex(),
            self.public_key_hex,
            timestamp,
        )
    
    def get_headers(self, body: str) -> dict:
        """
        Get authentication headers for a request.
        
        Args:
            body: The request body as a string
            
        Returns:
            Dictionary of headers to include in the request
        """
        signature, pubkey, timestamp = self.sign(body)
        
        return {
            "X-Alephnet-Pubkey": pubkey,
            "X-Alephnet-Signature": signature,
            "X-Alephnet-Timestamp": timestamp,
        }


def generate_keypair() -> Tuple[str, str]:
    """
    Generate a new Ed25519 keypair.
    
    Returns:
        Tuple of (private_key_hex, public_key_hex)
    """
    signing_key, verifying_key = ed25519.create_keypair()
    return (
        signing_key.to_bytes().hex(),
        verifying_key.to_bytes().hex(),
    )
