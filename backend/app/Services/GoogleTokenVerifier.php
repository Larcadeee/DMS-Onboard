<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use UnexpectedValueException;

class GoogleTokenVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private const ISSUERS = [
        'accounts.google.com',
        'https://accounts.google.com',
    ];

    /**
     * Verify a Google ID token and return its claims.
     *
     * @return array<string, mixed>
     *
     * @throws UnexpectedValueException when the token is malformed or invalid
     * @throws RuntimeException when Google sign-in is not configured
     */
    public function verify(string $idToken): array
    {
        $clientId = config('services.google.client_id');

        if (!$clientId) {
            throw new RuntimeException('Google sign-in is not configured.');
        }

        $segments = explode('.', $idToken);

        if (count($segments) !== 3) {
            throw new UnexpectedValueException('The Google credential is malformed.');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $segments;

        $header = json_decode($this->base64UrlDecode($encodedHeader), true);
        $claims = json_decode($this->base64UrlDecode($encodedPayload), true);

        if (!is_array($header) || !is_array($claims)) {
            throw new UnexpectedValueException('The Google credential is malformed.');
        }

        if (($header['alg'] ?? null) !== 'RS256') {
            throw new UnexpectedValueException('Unsupported Google credential signature.');
        }

        if (!in_array($claims['iss'] ?? null, self::ISSUERS, true)) {
            throw new UnexpectedValueException('The Google credential issuer is invalid.');
        }

        $audience = $claims['aud'] ?? null;

        if (!is_string($audience) || !hash_equals($clientId, $audience)) {
            throw new UnexpectedValueException('The Google credential audience is invalid.');
        }

        $expiresAt = (int) ($claims['exp'] ?? 0);

        if ($expiresAt <= time()) {
            throw new UnexpectedValueException('The Google credential has expired.');
        }

        if (($claims['email_verified'] ?? false) !== true || empty($claims['email'])) {
            throw new UnexpectedValueException('The Google account email is not verified.');
        }

        $key = $this->publicKey($header['kid'] ?? null);

        $verified = openssl_verify(
            $encodedHeader . '.' . $encodedPayload,
            $this->base64UrlDecode($encodedSignature),
            $key,
            OPENSSL_ALGO_SHA256
        );

        if ($verified !== 1) {
            throw new UnexpectedValueException('The Google credential signature could not be verified.');
        }

        return $claims;
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function certificates(): array
    {
        return Cache::remember('google_oauth_certs', now()->addHours(6), function (): array {
            $response = Http::timeout(5)->get(self::CERTS_URL);

            if (!$response->successful()) {
                throw new RuntimeException('Unable to reach Google to verify sign-in. Try again shortly.');
            }

            return $response->json('keys', []);
        });
    }

    private function publicKey(?string $keyId): string
    {
        $keys = $this->certificates();

        $jwk = null;

        foreach ($keys as $candidate) {
            if ($keyId === null || ($candidate['kid'] ?? null) === $keyId) {
                $jwk = $candidate;
                break;
            }
        }

        if (!$jwk || empty($jwk['n']) || empty($jwk['e'])) {
            Cache::forget('google_oauth_certs');

            throw new UnexpectedValueException('The Google signing key is unavailable.');
        }

        $modulus = $this->base64UrlDecode($jwk['n']);
        $exponent = $this->base64UrlDecode($jwk['e']);

        $rsaKey = $this->encodeSequence(
            $this->encodeInteger($modulus) . $this->encodeInteger($exponent)
        );

        $algorithm = $this->encodeSequence(
            "\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00"
        );

        $subjectPublicKeyInfo = $this->encodeSequence(
            $algorithm . "\x03" . $this->encodeLength(strlen($rsaKey) + 1) . "\x00" . $rsaKey
        );

        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split(base64_encode($subjectPublicKeyInfo), 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    private function encodeLength(int $length): string
    {
        if ($length < 0x80) {
            return chr($length);
        }

        $bytes = ltrim(pack('N', $length), "\x00");

        return chr(0x80 | strlen($bytes)) . $bytes;
    }

    private function encodeInteger(string $value): string
    {
        $value = ltrim($value, "\x00");

        if ($value === '' || ord($value[0]) > 0x7f) {
            $value = "\x00" . $value;
        }

        return "\x02" . $this->encodeLength(strlen($value)) . $value;
    }

    private function encodeSequence(string $value): string
    {
        return "\x30" . $this->encodeLength(strlen($value)) . $value;
    }

    private function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;

        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        return (string) base64_decode(strtr($value, '-_', '+/'), true);
    }
}
