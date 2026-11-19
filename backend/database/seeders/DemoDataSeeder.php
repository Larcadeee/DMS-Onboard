<?php

namespace Database\Seeders;

use App\Models\Assessment;
use App\Models\AssessmentAttempt;
use App\Models\AssessmentResponse;
use App\Models\CompetencyEvaluation;
use App\Models\CurriculumPhase;
use App\Models\CurriculumVersion;
use App\Models\Enrollment;
use App\Models\ModuleCompetency;
use App\Models\ModuleCompletion;
use App\Models\Notification;
use App\Models\Program;
use App\Models\Role;
use App\Models\SessionAttendance;
use App\Models\Setting;
use App\Models\TrainingMaterial;
use App\Models\TrainingModule;
use App\Models\TrainingSession;
use App\Models\Trainee;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::pluck('id', 'slug');

        $supervisor = User::updateOrCreate(
            ['email' => 'supervisor@cdrrmd.gov.ph'],
            [
                'name' => 'Maria Santos',
                'password' => Hash::make('Supervisor@12345'),
                'role_id' => $roles['training_supervisor'] ?? null,
                'is_active' => true,
                'must_change_password' => false,
            ]
        );

        $trainer = User::updateOrCreate(
            ['email' => 'trainer@cdrrmd.gov.ph'],
            [
                'name' => 'Jose Dela Cruz',
                'password' => Hash::make('Trainer@12345'),
                'role_id' => $roles['trainer_evaluator'] ?? null,
                'is_active' => true,
                'must_change_password' => false,
            ]
        );

        $program = Program::updateOrCreate(
            ['code' => 'ETC-ONB-2026'],
            [
                'name' => 'Emergency Telecommunicator Onboarding Program',
                'description' => 'Structured onboarding for newly hired Emergency Telecommunicators covering orientation, technical instruction, supervised deployment and final competency validation.',
                'objectives' => 'Produce operationally ready Emergency Telecommunicators who demonstrate safe, accurate and professional dispatch practice.',
                'target_participants' => 'Newly hired Emergency Telecommunicators of the CDRRMD Dispatch Management Section.',
                'duration_days' => 90,
                'start_date' => now()->subDays(45)->toDateString(),
                'end_date' => now()->addDays(45)->toDateString(),
                'status' => 'active',
                'is_active' => true,
                'created_by' => User::where('email', 'admin@cdrrmd.gov.ph')->value('id'),
            ]
        );

        $version = CurriculumVersion::updateOrCreate(
            ['program_id' => $program->id, 'version_number' => '1.0'],
            [
                'title' => 'ETC Onboarding Curriculum 2026',
                'description' => 'Seven-phase competency-based curriculum.',
                'effective_from' => now()->subDays(60)->toDateString(),
                'status' => 'published',
                'published_at' => now()->subDays(60),
            ]
        );

        $phases = [
            ['Organizational Orientation', 'Agency mandate, organizational structure, policies and professionalism.'],
            ['Operational Familiarization', 'Dispatch operations, CAD environment and situational awareness.'],
            ['Technical Instruction', 'Radio communications, call handling and dispatch procedures.'],
            ['Emergency Communications Training', 'Emergency call simulation and call prioritization.'],
            ['Practical Exercises and Scenario-Based Learning', 'Applied scenario drills individually and in teams.'],
            ['Supervised Operational Deployment', 'Live dispatch under direct supervision and documentation.'],
            ['Competency Assessment and Final Evaluation', 'Final practical evaluation and competency validation.'],
        ];

        $modulesByPhase = [
            [['M-101', 'Agency Orientation and Mandate'], ['M-102', 'Policies and Code of Conduct']],
            [['M-201', 'Dispatch Operations Overview'], ['M-202', 'CAD System Familiarization']],
            [['M-301', 'Radio Communications Procedures'], ['M-302', 'Emergency Call Handling']],
            [['M-401', 'Emergency Communications Simulation'], ['M-402', 'Call Prioritization and Triage']],
            [['M-501', 'Scenario-Based Dispatch Exercises'], ['M-502', 'Stress and Crisis Management']],
            [['M-601', 'Supervised Live Dispatch'], ['M-602', 'Operational Documentation']],
            [['M-701', 'Final Practical Evaluation'], ['M-702', 'Competency Validation']],
        ];

        $phasesCreated = [];
        $modules = collect();

        foreach ($phases as $index => [$name, $description]) {
            $phase = CurriculumPhase::updateOrCreate(
                ['curriculum_version_id' => $version->id, 'phase_number' => $index + 1],
                ['name' => $name, 'description' => $description, 'duration_days' => 12, 'sort_order' => $index + 1]
            );
            $phasesCreated[] = $phase;

            foreach ($modulesByPhase[$index] as $sort => [$code, $title]) {
                $module = TrainingModule::updateOrCreate(
                    ['code' => $code],
                    [
                        'curriculum_phase_id' => $phase->id,
                        'title' => $title,
                        'description' => "{$title} covering the knowledge and performance requirements of {$name}.",
                        'learning_objectives' => [
                            "Explain the key concepts of {$title}.",
                            "Demonstrate the required procedure for {$title}.",
                            'Document performance according to CDRRMD standards.',
                        ],
                        'estimated_minutes' => 240,
                        'sort_order' => $sort + 1,
                        'is_required' => true,
                        'is_active' => true,
                    ]
                );
                $modules->push($module);

                ModuleCompetency::updateOrCreate(
                    ['code' => $code . '-C1'],
                    [
                        'training_module_id' => $module->id,
                        'name' => "{$title} Competency",
                        'category' => $index < 2 ? 'Core Operations' : ($index < 5 ? 'Technical Proficiency' : 'Operational Readiness'),
                        'description' => "Applied competency for {$title}.",
                        'expected_performance' => 'Performs the required task accurately and independently under operational conditions.',
                        'evaluation_criteria' => 'Accuracy, procedure compliance, communication quality and timeliness.',
                        'is_required' => true,
                        'sort_order' => 1,
                    ]
                );

                if ($index >= 2) {
                    ModuleCompetency::updateOrCreate(
                        ['code' => $code . '-C2'],
                        [
                            'training_module_id' => $module->id,
                            'name' => "{$title} Documentation and Reporting",
                            'category' => 'Documentation',
                            'description' => 'Accurate recording and reporting of operational activity.',
                            'expected_performance' => 'Completes required documentation within prescribed timelines.',
                            'evaluation_criteria' => 'Completeness, accuracy, legibility and timeliness.',
                            'is_required' => $index >= 4,
                            'sort_order' => 2,
                        ]
                    );
                }

                TrainingMaterial::updateOrCreate(
                    ['title' => "{$title} Learning Guide", 'training_module_id' => $module->id],
                    [
                        'program_id' => $program->id,
                        'curriculum_phase_id' => $phase->id,
                        'description' => "Reference reading and participant guide for {$title}.",
                        'document_type' => 'guide',
                        'status' => 'published',
                        'uploaded_by' => $trainer->id,
                    ]
                );
            }
        }

        $written = Assessment::updateOrCreate(
            ['title' => 'Radio Communications Procedures Examination'],
            [
                'training_module_id' => $modules->firstWhere('code', 'M-301')->id,
                'instructions' => 'Answer all questions. Passing score is 75% of total points.',
                'assessment_type' => 'written',
                'total_points' => 100,
                'passing_score' => 75,
                'time_limit_minutes' => 60,
                'attempts_allowed' => 2,
                'is_published' => true,
                'release_results' => true,
                'evaluator_id' => $trainer->id,
                'created_by' => $trainer->id,
            ]
        );

        if ($written->questions()->count() === 0) {
            $questions = [
                ['What is the standard phonetic alphabet word for the letter "A"?', ['Alpha', 'Apple', 'Able', 'Anvil'], 'Alpha', 20],
                ['Which call type generally receives the highest dispatch priority?', ['Structural fire with trapped occupants', 'Minor traffic collision', 'Noise complaint', 'Animal rescue'], 'Structural fire with trapped occupants', 40],
                ['When should a dispatcher request additional information from a caller?', ['When it does not delay the emergency response', 'Never', 'Only after dispatch', 'Only for medical calls'], 'When it does not delay the emergency response', 40],
            ];

            foreach ($questions as $sort => [$text, $options, $correct, $points]) {
                $written->questions()->create([
                    'question_type' => 'multiple_choice',
                    'question_text' => $text,
                    'options' => $options,
                    'correct_answer' => ['value' => $correct],
                    'points' => $points,
                    'sort_order' => $sort + 1,
                ]);
            }
        }

        Assessment::updateOrCreate(
            ['title' => 'Final Practical Dispatch Evaluation'],
            [
                'training_module_id' => $modules->firstWhere('code', 'M-701')->id,
                'instructions' => 'Simulated live dispatch evaluation scored by the assigned evaluator.',
                'assessment_type' => 'practical',
                'total_points' => 100,
                'passing_score' => 80,
                'attempts_allowed' => 1,
                'is_published' => true,
                'release_results' => false,
                'evaluator_id' => $trainer->id,
                'created_by' => $trainer->id,
            ]
        );

        $sessionsData = [
            ['M-301', 'Radio Communications Procedures - Session 1', 2],
            ['M-302', 'Emergency Call Handling Workshop', 4],
            ['M-401', 'Emergency Communications Simulation Lab', 7],
            ['M-501', 'Scenario-Based Dispatch Exercise', 10],
        ];

        foreach ($sessionsData as [$code, $title, $daysAhead]) {
            $module = $modules->firstWhere('code', $code);
            $session = TrainingSession::updateOrCreate(
                ['title' => $title],
                [
                    'training_module_id' => $module->id,
                    'description' => "Scheduled training activity for {$module->title}.",
                    'session_type' => $daysAhead > 8 ? 'scenario' : 'classroom',
                    'delivery_mode' => 'onsite',
                    'starts_at' => now()->addDays($daysAhead)->setTime(9, 0),
                    'ends_at' => now()->addDays($daysAhead)->setTime(12, 0),
                    'location' => 'CDRRMD Training Room',
                    'capacity' => 20,
                    'status' => 'scheduled',
                    'created_by' => $trainer->id,
                ]
            );

            $session->attendances()->delete();
        }

        $traineeData = [
            ['Ana', 'Reyes', 'trainee.ana@cdrrmd.gov.ph', 'ETC-00001', 'ongoing', 3, 78],
            ['Ben', 'Cruz', 'trainee.ben@cdrrmd.gov.ph', 'ETC-00002', 'pending_review', 8, 100],
            ['Carla', 'Mendoza', 'trainee.carla@cdrrmd.gov.ph', 'ETC-00003', 'completed', 14, 100],
        ];

        foreach ($traineeData as [$first, $last, $email, $number, $status, $completedModules, $completionPct]) {
            $user = User::updateOrCreate(
                ['email' => $email],
                [
                    'name' => "{$first} {$last}",
                    'password' => Hash::make('Trainee@12345'),
                    'role_id' => $roles['etc_trainee'] ?? null,
                    'is_active' => true,
                    'must_change_password' => false,
                ]
            );

            $trainee = Trainee::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'trainee_number' => $number,
                    'first_name' => $first,
                    'last_name' => $last,
                    'contact_number' => '0917' . random_int(1000000, 9999999),
                    'address' => 'Butuan City',
                    'employment_status' => 'probationary',
                    'trainee_status' => $status === 'completed' ? 'completed' : 'active',
                ]
            );

            $enrollment = Enrollment::updateOrCreate(
                ['trainee_id' => $trainee->id, 'curriculum_version_id' => $version->id],
                [
                    'enrollment_number' => 'ENR-DEMO-' . str_pad((string) $trainee->id, 3, '0', STR_PAD_LEFT),
                    'assigned_by' => $supervisor->id,
                    'assigned_trainer_id' => $trainer->id,
                    'assigned_supervisor_id' => $supervisor->id,
                    'current_phase_id' => $phasesCreated[min(6, intdiv($completedModules, 2))]->id,
                    'status' => $status,
                    'enrolled_at' => now()->subDays(40),
                    'started_at' => now()->subDays(38),
                    'completed_at' => $status === 'completed' ? now()->subDays(2) : null,
                    'submitted_for_review_at' => $status !== 'ongoing' ? now()->subDays(1) : null,
                ]
            );

            $selected = $modules->take($completedModules);
            foreach ($selected as $module) {
                ModuleCompletion::updateOrCreate(
                    ['enrollment_id' => $enrollment->id, 'training_module_id' => $module->id],
                    ['completed_at' => now()->subDays(random_int(1, 20)), 'completed_by' => $trainer->id]
                );
            }

            $competencies = ModuleCompetency::whereIn('training_module_id', $selected->pluck('id'))->get();
            foreach ($competencies->take(6) as $index => $competency) {
                CompetencyEvaluation::updateOrCreate(
                    ['enrollment_id' => $enrollment->id, 'module_competency_id' => $competency->id, 'evaluation_number' => 1],
                    [
                        'evaluator_id' => $trainer->id,
                        'rating' => $index % 3 === 0 ? 4 : 5,
                        'status' => $index % 4 === 0 ? 'competent' : 'validated',
                        'validated_by' => $index % 4 === 0 ? null : $supervisor->id,
                        'validated_at' => $index % 4 === 0 ? null : now()->subDays(1),
                        'feedback' => 'Demonstrates consistent performance with minor coaching points.',
                        'strengths' => 'Clear radio discipline and accurate documentation.',
                        'improvement_plan' => 'Continue scenario practice for complex multi-agency incidents.',
                        'evaluated_at' => now()->subDays(random_int(1, 10)),
                    ]
                );
            }

            $attempt = AssessmentAttempt::updateOrCreate(
                ['assessment_id' => $written->id, 'enrollment_id' => $enrollment->id, 'attempt_number' => 1],
                [
                    'started_at' => now()->subDays(5),
                    'submitted_at' => now()->subDays(5),
                    'score' => $completionPct >= 80 ? 88 : 72,
                    'status' => 'evaluated',
                    'evaluated_by' => $trainer->id,
                    'feedback' => 'Satisfactory performance. Continue reviewing prioritization criteria.',
                ]
            );

            if ($attempt->responses()->count() === 0) {
                foreach ($written->questions as $question) {
                    AssessmentResponse::create([
                        'assessment_attempt_id' => $attempt->id,
                        'assessment_question_id' => $question->id,
                        'answer' => ['value' => $question->correct_answer['value'] ?? null],
                        'awarded_points' => $question->points,
                        'evaluated_by' => $trainer->id,
                    ]);
                }
            }

            foreach (TrainingSession::all() as $session) {
                SessionAttendance::updateOrCreate(
                    ['training_session_id' => $session->id, 'enrollment_id' => $enrollment->id],
                    [
                        'attendance_status' => $status === 'ongoing' && $session->starts_at->isFuture() ? 'unmarked' : 'present',
                        'check_in_at' => $session->starts_at,
                        'check_out_at' => $session->ends_at,
                        'recorded_by' => $trainer->id,
                    ]
                );
            }
        }

        Setting::updateOrCreate(['key' => 'application_name'], ['group' => 'general', 'value' => 'CDRRMD Onboarding Management System']);
        Setting::updateOrCreate(['key' => 'organization_name'], ['group' => 'general', 'value' => 'Butuan City Disaster Risk Reduction and Management Department']);
        Setting::updateOrCreate(['key' => 'time_zone'], ['group' => 'general', 'value' => 'Asia/Manila']);
        Setting::updateOrCreate(['key' => 'date_format'], ['group' => 'general', 'value' => 'Y-m-d']);
        Setting::updateOrCreate(['key' => 'attendance_threshold'], ['group' => 'onboarding', 'value' => 80]);
        Setting::updateOrCreate(['key' => 'auto_release_results'], ['group' => 'onboarding', 'value' => false]);
        Setting::updateOrCreate(['key' => 'max_upload_size_mb'], ['group' => 'files', 'value' => 20]);
        Setting::updateOrCreate(['key' => 'allowed_file_types'], ['group' => 'files', 'value' => ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg']]);
        Setting::updateOrCreate(['key' => 'notifications_enabled'], ['group' => 'notifications', 'value' => true]);

        foreach (User::all() as $user) {
            Notification::firstOrCreate(
                ['user_id' => $user->id, 'title' => 'Welcome to the Onboarding Management System'],
                [
                    'message' => 'Your onboarding portal is ready. Review your dashboard for assigned activities.',
                    'type' => 'info',
                    'link' => '/dashboard',
                ]
            );
        }
    }
}
