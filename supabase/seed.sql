-- Seed data for Crias na Floresta dashboard
-- Run this in the Supabase SQL Editor after running both migrations.

-- Months
INSERT INTO months (year, month, status)
VALUES (2026, 7, 'active')
ON CONFLICT (year, month) DO NOTHING;

-- Settings
INSERT INTO settings (key, value)
VALUES ('default_session_capacity', '16')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Families
INSERT INTO families (id, parent_name, email, phone) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Ana Sofia Mendes',   'ana.mendes@gmail.com',       '+351 912 345 678'),
  ('f0000000-0000-0000-0000-000000000002', 'Carlos Silva',        'carlos.silva@outlook.pt',    '+351 963 210 987'),
  ('f0000000-0000-0000-0000-000000000003', 'Maria Joao Ferreira', 'mjoao.ferreira@sapo.pt',     '+351 934 567 891'),
  ('f0000000-0000-0000-0000-000000000004', 'Rui Figueiredo',      'rui.figueiredo@gmail.com',   '+351 919 876 543'),
  ('f0000000-0000-0000-0000-000000000005', 'Ines Cardoso',        'ines.cardoso@hotmail.com',   '+351 966 543 210'),
  ('f0000000-0000-0000-0000-000000000006', 'Patricia Lopes',      'patricia.lopes@gmail.com',   '+351 937 654 321'),
  ('f0000000-0000-0000-0000-000000000007', 'Teresa Almeida',      'teresa.almeida@gmail.com',   '+351 961 333 444'),
  ('f0000000-0000-0000-0000-000000000008', 'Francisco Rocha',     'francisco.rocha@netcabo.pt', '+351 912 111 222')
ON CONFLICT (email) DO NOTHING;

-- Registrations (one statement per row avoids VALUES-list length errors)

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'tally-001', 'julho', 2026, E'Pack mensal 4 sessões (50€)', 50, 4, 1, 50, ARRAY[E'5 (manhã)', E'12 (manhã)', E'19 (manhã)', E'26 (manhã)'], 'pendente', 'Sim, autorizo', false, null, 'Alergia a amendoim. Primeiro contacto com a natureza.', null, false, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'tally-002', 'julho', 2026, E'Pack mensal 8 sessões + 16 registos fotográficos (132€)', 132, 8, 2, 132, ARRAY[E'5 (manhã)', E'12 (manhã)', E'19 (manhã)', E'26 (manhã)'], 'pago_confirmado', 'Sim, autorizo', true, 'FLORESTA10', null, null, false, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', 'tally-003', 'julho', 2026, E'2 sessões + 6 registos fotográficos (40€)', 40, 2, 1, 40, ARRAY[E'5 (manhã)', E'19 (manhã)'], 'a_pagar', E'Não autorizo', true, null, null, '234 567 890', true, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004', 'tally-004', 'julho', 2026, E'Pack mensal 8 sessões + 16 registos fotográficos (132€)', 132, 8, 1, 132, ARRAY[E'5 (manhã)', E'12 (manhã)', E'19 (manhã)', E'26 (manhã)'], 'pendente', 'Sim, autorizo', true, null, null, '256 789 012', true, true, 'Timeout ao tentar contactar o endpoint do Brevo. Retentar.')
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000005', 'tally-005', 'julho', 2026, E'1 sessão (14€)', 14, 1, 1, 14, ARRAY['12 (tarde)'], 'pago_confirmado', 'Sim, autorizo', false, null, null, null, false, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000006', 'tally-006', 'julho', 2026, E'Pack mensal 4 sessões (50€)', 50, 4, 2, 100, ARRAY[E'5 (manhã)', E'12 (manhã)', E'19 (manhã)', E'26 (manhã)'], 'lembrete', 'Apenas para uso interno', false, null, E'Criança mais nova ainda a adaptar-se ao grupo.', null, false, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000007', 'tally-007', 'julho', 2026, E'Pack mensal 4 sessões (50€)', 50, 4, 1, 50, ARRAY[E'5 (manhã)', E'12 (manhã)', E'19 (manhã)', E'26 (manhã)'], 'pago_confirmado', 'Sim, autorizo', false, null, null, null, false, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

INSERT INTO registrations (id, family_id, tally_submission_id, month, year, plan, unit_price, num_sessions, num_children, total_price, selected_dates, status, image_consent, has_photos, voucher_code, notes, nif, invoice_requested, webhook_error, webhook_error_message)
VALUES ('a0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000008', 'tally-008', 'julho', 2026, E'2 sessões (26€)', 26, 2, 1, 26, ARRAY[E'5 (manhã)', E'19 (manhã)'], 'cancelado', E'Não autorizo', false, null, E'Cancelou por férias no estrangeiro.', null, false, false, null)
ON CONFLICT (tally_submission_id) DO NOTHING;

-- Children
INSERT INTO children (registration_id, name, date_of_birth) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Pedro Mendes',      '2023-03-15'),
  ('a0000000-0000-0000-0000-000000000002', 'Maria Silva',        '2021-07-20'),
  ('a0000000-0000-0000-0000-000000000002', E'João Silva',  '2019-11-03'),
  ('a0000000-0000-0000-0000-000000000003', 'Sofia Ferreira',     '2022-05-08'),
  ('a0000000-0000-0000-0000-000000000004', 'Beatriz Figueiredo', '2020-09-25'),
  ('a0000000-0000-0000-0000-000000000005', E'Tomás Cardoso', '2023-01-14'),
  ('a0000000-0000-0000-0000-000000000006', 'Leonor Lopes',       '2021-04-30'),
  ('a0000000-0000-0000-0000-000000000006', 'Martim Lopes',       '2023-08-12'),
  ('a0000000-0000-0000-0000-000000000007', 'Afonso Almeida',     '2019-06-05'),
  ('a0000000-0000-0000-0000-000000000008', 'Gabriel Rocha',      '2020-02-18');
