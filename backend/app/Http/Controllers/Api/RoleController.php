<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::with(['permissions:id,name,slug,module'])
            ->withCount('users')
            ->orderBy('id')
            ->get();

        return response()->json([
            'roles' => $roles,
            'permissions' => Permission::orderBy('module')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name'],
            'slug' => ['required', 'string', 'max:100', 'unique:roles,slug'],
            'description' => ['nullable', 'string'],
        ]);

        $role = Role::create([...$data, 'is_active' => true]);
        $audit->record($request, 'role.created', 'Role', $role->id, 'Role created.');

        return response()->json(['message' => 'Role created.', 'role' => $role], 201);
    }

    public function update(Request $request, Role $role, AuditLogger $audit)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('roles', 'name')->ignore($role->id)],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $role->update($data);
        $audit->record($request, 'role.updated', 'Role', $role->id, 'Role updated.');

        return response()->json(['message' => 'Role updated.', 'role' => $role]);
    }

    public function syncPermissions(Request $request, Role $role, AuditLogger $audit)
    {
        $data = $request->validate([
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role->permissions()->sync($data['permission_ids']);
        $audit->record($request, 'role.permissions_updated', 'Role', $role->id, 'Role permissions updated.', [
            'permission_count' => count($data['permission_ids']),
        ]);

        return response()->json(['message' => 'Permissions updated.', 'role' => $role->load('permissions')]);
    }

    public function assignableUsers()
    {
        return response()->json(
            \App\Models\User::select('id', 'name', 'email', 'role_id')->orderBy('name')->get()
        );
    }
}
