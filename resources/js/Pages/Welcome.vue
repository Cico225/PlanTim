<template>
    <div class="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-900 dark:to-dark-800">
        <div class="container mx-auto px-4 py-16">
            <div class="text-center">
                <h1 class="text-6xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                    PlanTim
                </h1>
                <p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
                    Enterprise Kolaboracijski Alat
                </p>
                <div class="flex justify-center gap-4">
                    <Link :href="route('login')" class="btn-primary">
                        Prijava
                    </Link>
                    <Link :href="route('register')" class="btn-secondary">
                        Registracija
                    </Link>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { Link } from '@inertiajs/vue3';
</script>

<style scoped>
.btn-primary {
    @apply px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition;
}

.btn-secondary {
    @apply px-6 py-3 bg-white text-primary-600 border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition;
}
</style>

