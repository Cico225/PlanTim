<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ============================================
        // 1. PROŠIRENJE POSTOJEĆIH TABELA
        // ============================================
        
        // Proširenje crm_companies (Accounts)
        Schema::table('crm_companies', function (Blueprint $table) {
            // Dodaj polja ako ne postoje
            if (!Schema::hasColumn('crm_companies', 'legal_name')) {
                $table->string('legal_name')->nullable()->after('name');
            }
            if (!Schema::hasColumn('crm_companies', 'type')) {
                $table->enum('type', ['client', 'lead', 'supplier', 'partner'])->default('client')->after('legal_name');
            }
            if (!Schema::hasColumn('crm_companies', 'status')) {
                $table->enum('status', ['active', 'inactive', 'archived'])->default('active')->after('type');
            }
            if (!Schema::hasColumn('crm_companies', 'annual_revenue')) {
                // Dodaj nakon size ako postoji, inače nakon industry
                if (Schema::hasColumn('crm_companies', 'size')) {
                    $table->decimal('annual_revenue', 15, 2)->nullable()->after('size');
                } else {
                    $table->decimal('annual_revenue', 15, 2)->nullable()->after('industry');
                }
            }
            if (!Schema::hasColumn('crm_companies', 'tax_id')) {
                $table->string('tax_id', 50)->nullable()->after('annual_revenue'); // PDV / OIB
            }
            if (!Schema::hasColumn('crm_companies', 'registration_number')) {
                $table->string('registration_number', 50)->nullable()->after('tax_id'); // Matični broj
            }
            if (!Schema::hasColumn('crm_companies', 'source')) {
                $table->enum('source', ['web', 'referral', 'campaign', 'manual'])->default('manual')->after('registration_number');
            }
            if (!Schema::hasColumn('crm_companies', 'rating')) {
                $table->enum('rating', ['A', 'B', 'C', 'D', 'E'])->nullable()->after('source');
            }
            if (!Schema::hasColumn('crm_companies', 'street')) {
                $table->string('street')->nullable()->after('address');
            }
            if (!Schema::hasColumn('crm_companies', 'last_activity_date')) {
                $table->timestamp('last_activity_date')->nullable()->after('updated_at');
            }
        });

        // Proširenje crm_contacts
        Schema::table('crm_contacts', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_contacts', 'department')) {
                if (Schema::hasColumn('crm_contacts', 'position')) {
                    $table->string('department', 100)->nullable()->after('position');
                } else {
                    $table->string('department', 100)->nullable();
                }
            }
            if (!Schema::hasColumn('crm_contacts', 'status')) {
                $table->enum('status', ['active', 'former', 'lead'])->default('active');
            }
            if (!Schema::hasColumn('crm_contacts', 'is_primary')) {
                $table->boolean('is_primary')->default(false);
            }
            if (!Schema::hasColumn('crm_contacts', 'preferred_communication')) {
                $table->enum('preferred_communication', ['email', 'phone', 'mobile', 'linkedin'])->default('email');
            }
            if (!Schema::hasColumn('crm_contacts', 'linkedin')) {
                if (Schema::hasColumn('crm_contacts', 'mobile')) {
                    $table->string('linkedin')->nullable()->after('mobile');
                } else {
                    $table->string('linkedin')->nullable();
                }
            }
            if (!Schema::hasColumn('crm_contacts', 'last_interaction_date')) {
                $table->timestamp('last_interaction_date')->nullable();
            }
        });

        // Proširenje crm_deals
        Schema::table('crm_deals', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_deals', 'pipeline')) {
                if (Schema::hasColumn('crm_deals', 'stage')) {
                    $table->string('pipeline', 50)->default('sales')->after('stage'); // sales, upsell, renewal
                } else {
                    $table->string('pipeline', 50)->default('sales');
                }
            }
            if (!Schema::hasColumn('crm_deals', 'estimated_revenue')) {
                if (Schema::hasColumn('crm_deals', 'value')) {
                    $table->decimal('estimated_revenue', 15, 2)->nullable()->after('value'); // value * probability
                } else {
                    $table->decimal('estimated_revenue', 15, 2)->nullable();
                }
            }
            if (!Schema::hasColumn('crm_deals', 'lost_reason')) {
                if (Schema::hasColumn('crm_deals', 'actual_close_date')) {
                    $table->text('lost_reason')->nullable()->after('actual_close_date');
                } else {
                    $table->text('lost_reason')->nullable();
                }
            }
            if (!Schema::hasColumn('crm_deals', 'source')) {
                $table->enum('source', ['web', 'referral', 'campaign', 'manual', 'cold_call'])->default('manual');
            }
            if (!Schema::hasColumn('crm_deals', 'campaign_id')) {
                $table->string('campaign_id', 100)->nullable();
            }
            if (!Schema::hasColumn('crm_deals', 'project_id')) {
                $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            }
        });

        // Proširenje crm_activities
        Schema::table('crm_activities', function (Blueprint $table) {
            if (!Schema::hasColumn('crm_activities', 'status')) {
                if (Schema::hasColumn('crm_activities', 'type')) {
                    $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled')->after('type');
                } else {
                    $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
                }
            }
            if (!Schema::hasColumn('crm_activities', 'related_entity_type')) {
                if (Schema::hasColumn('crm_activities', 'deal_id')) {
                    $table->string('related_entity_type', 50)->nullable()->after('deal_id'); // account, contact, deal
                } else {
                    $table->string('related_entity_type', 50)->nullable();
                }
            }
            if (!Schema::hasColumn('crm_activities', 'related_entity_id')) {
                $table->unsignedBigInteger('related_entity_id')->nullable();
            }
        });

        // ============================================
        // 2. NOVE TABELE
        // ============================================

        // CRM Tags
        if (!Schema::hasTable('crm_tags')) {
            Schema::create('crm_tags', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('color', 20)->default('#3B82F6');
            $table->string('module', 50)->default('crm'); // crm, projects, etc.
            $table->timestamps();
            });
        }

        // Entity Tags (polymorphic)
        if (!Schema::hasTable('crm_entity_tags')) {
            Schema::create('crm_entity_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tag_id')->constrained('crm_tags')->cascadeOnDelete();
            $table->string('entity_type', 50); // account, contact, deal
            $table->unsignedBigInteger('entity_id');
            $table->timestamps();

            $table->unique(['tag_id', 'entity_type', 'entity_id']);
            $table->index(['entity_type', 'entity_id']);
            });
        }

        // CRM Documents
        if (!Schema::hasTable('crm_documents')) {
            Schema::create('crm_documents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('file_path');
            $table->string('file_type', 50)->nullable(); // ponuda, ugovor, prezentacija
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('entity_type'); // account, contact, deal
            $table->unsignedBigInteger('entity_id');
            $table->integer('version')->default(1);
            $table->string('status', 50)->default('draft'); // draft, final, archived
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('uploaded_at');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['entity_type', 'entity_id']);
            $table->index('file_type');
            });
        }

        // Pipelines
        if (!Schema::hasTable('crm_pipelines')) {
            Schema::create('crm_pipelines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            });
        }

        // Deal Stages (faze unutar pipeline-a)
        if (!Schema::hasTable('crm_deal_stages')) {
            Schema::create('crm_deal_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pipeline_id')->constrained('crm_pipelines')->cascadeOnDelete();
            $table->string('name');
            $table->string('stage_key', 50); // lead, qualified, proposal, etc.
            $table->integer('sort_order')->default(0);
            $table->integer('default_probability')->default(0);
            $table->string('color', 20)->nullable();
            $table->timestamps();

            $table->index('pipeline_id');
            $table->unique(['pipeline_id', 'stage_key']);
            });
        }

        // CRM Audit Log
        if (!Schema::hasTable('crm_audit_logs')) {
            Schema::create('crm_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type'); // account, contact, deal, activity
            $table->unsignedBigInteger('entity_id');
            $table->string('action', 50); // created, updated, deleted, status_changed, etc.
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('user_id');
            $table->index('action');
            $table->index('created_at');
            });
        }

        // Deal to Task mapping (za automatsko kreiranje taskova)
        if (!Schema::hasTable('crm_deal_tasks')) {
            Schema::create('crm_deal_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_id')->constrained('crm_deals')->cascadeOnDelete();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('task_type', 50)->nullable(); // follow_up, proposal, negotiation, etc.
            $table->timestamps();

            $table->unique(['deal_id', 'task_id']);
            $table->index('deal_id');
            $table->index('task_id');
            });
        }

        // Deal to Project mapping (za vezu deal-a i projekta)
        if (!Schema::hasTable('crm_deal_projects')) {
            Schema::create('crm_deal_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_id')->constrained('crm_deals')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['deal_id', 'project_id']);
            $table->index('deal_id');
            $table->index('project_id');
            });
        }

        // Communication Log (za email/chat integraciju)
        if (!Schema::hasTable('crm_communication_logs')) {
            Schema::create('crm_communication_logs', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['email', 'chat', 'call', 'meeting'])->default('email');
            $table->string('subject')->nullable();
            $table->text('content')->nullable();
            $table->string('direction', 20)->default('outbound'); // inbound, outbound
            $table->string('entity_type'); // account, contact, deal
            $table->unsignedBigInteger('entity_id');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('external_id')->nullable(); // ID iz email/chat sistema
            $table->json('metadata')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('type');
            $table->index('user_id');
            });
        }

        // Custom Fields (za proširivost)
        if (!Schema::hasTable('crm_custom_fields')) {
            Schema::create('crm_custom_fields', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type'); // account, contact, deal
            $table->string('field_name');
            $table->string('field_type', 50); // text, number, date, select, etc.
            $table->string('label');
            $table->text('description')->nullable();
            $table->json('options')->nullable(); // za select, checkbox, etc.
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['entity_type', 'field_name']);
            $table->index('entity_type');
            });
        }

        // Custom Field Values
        if (!Schema::hasTable('crm_custom_field_values')) {
            Schema::create('crm_custom_field_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('custom_field_id')->constrained('crm_custom_fields')->cascadeOnDelete();
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['custom_field_id', 'entity_type', 'entity_id'], 'crm_cfv_unique');
            $table->index(['entity_type', 'entity_id']);
            });
        }
    }

    public function down(): void
    {
        // Obriši nove tabele
        Schema::dropIfExists('crm_custom_field_values');
        Schema::dropIfExists('crm_custom_fields');
        Schema::dropIfExists('crm_communication_logs');
        Schema::dropIfExists('crm_deal_projects');
        Schema::dropIfExists('crm_deal_tasks');
        Schema::dropIfExists('crm_audit_logs');
        Schema::dropIfExists('crm_deal_stages');
        Schema::dropIfExists('crm_pipelines');
        Schema::dropIfExists('crm_documents');
        Schema::dropIfExists('crm_entity_tags');
        Schema::dropIfExists('crm_tags');

        // Ukloni dodana polja (opciono - može se preskočiti ako želimo zadržati podatke)
        // Schema::table('crm_companies', function (Blueprint $table) {
        //     $table->dropColumn(['legal_name', 'type', 'status', ...]);
        // });
    }
};

