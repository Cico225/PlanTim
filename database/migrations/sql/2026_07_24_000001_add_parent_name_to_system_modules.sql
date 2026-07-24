-- PlanTim: hijerarhija modula (podmoduli za dozvole i meni)

ALTER TABLE system_modules
    ADD COLUMN parent_name VARCHAR(100) NULL AFTER name;

ALTER TABLE system_modules
    ADD INDEX idx_system_modules_parent_name (parent_name);

INSERT INTO system_modules (name, parent_name, display_name, description, icon, route, available_permissions, is_active, is_plugin, sort_order, created_at, updated_at)
SELECT 'planika.finance', 'planika', 'Finansije i računovodstvo', 'Finansijski podmodul Planika', 'FiDollarSign', '/planika/finance', '["view_reports","manage_budgets"]', 1, 1, 111, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_modules WHERE name = 'planika.finance');

INSERT INTO system_modules (name, parent_name, display_name, description, icon, route, available_permissions, is_active, is_plugin, sort_order, created_at, updated_at)
SELECT 'planika.finance.krediti', 'planika.finance', 'Krediti — uvoz, uparivanje zabrana i izvještaji', 'Upravljanje kreditima i zabrana', 'FiCreditCard', '/planika/finance/krediti', '["import","pair","export","report"]', 1, 1, 112, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_modules WHERE name = 'planika.finance.krediti');
