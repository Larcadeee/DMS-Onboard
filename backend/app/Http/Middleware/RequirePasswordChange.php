<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePasswordChange
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user?->must_change_password &&
            !$request->is('api/v1/user', 'api/v1/logout', 'api/v1/change-password')
        ) {
            return response()->json([
                'message' => 'You must change your password before accessing this resource.',
                'must_change_password' => true,
            ], 403);
        }

        return $next($request);
    }
}
