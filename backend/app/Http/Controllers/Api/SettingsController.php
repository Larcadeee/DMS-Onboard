<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        $settings = Setting::orderBy('group')->orderBy('key')->get();

        return response()->json([
            'groups' => $settings->groupBy('group')->map(
                fn ($items) => $items->mapWithKeys(fn ($item) => [$item->key => $item->value])
            ),
            'settings' => $settings,
        ]);
    }

    public function update(Request $request, AuditLogger $audit)
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:150'],
            'settings.*.group' => ['nullable', 'string', 'max:100'],
            'settings.*.value' => ['nullable'],
        ]);

        foreach ($data['settings'] as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['group' => $setting['group'] ?? 'general', 'value' => $setting['value']]
            );
        }

        $audit->record($request, 'settings.updated', 'Setting', null, 'System settings updated.');

        return response()->json(['message' => 'Settings saved successfully.']);
    }
}
