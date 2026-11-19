<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (!$user->is_active) {

            // Revoke the current Sanctum API token, if applicable.
            $token = $user->currentAccessToken();

            if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $token->delete();
            }

            return response()->json([
                'message' => 'Your account is inactive. Contact the system administrator.',
            ], 403);
        }

        return $next($request);
    }
}
