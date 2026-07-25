INSERT INTO users (nombre, email, password, rol, estado, is_active)
VALUES
('Admin', 'admin@test.com', '$2b$10$XHNr5oBTXe0wGoZsXXNeb.6YQNM2QWLJ./KGhDvm6CfNKeE4Ly', 'ADMIN', TRUE, TRUE),
('Solicitante', 'solicitante@test.com', '$2b$10$XHNr5oBTXe0wGoZsXXNeb.6YQNM2QWLJ./KGhDvm6CfNKeE4Ly', 'SOLICITANTE', TRUE, TRUE),
('Bodeguero', 'bodeguero@test.com', '$2b$10$XHNr5oBTXe0wGoZsXXNeb.6YQNM2QWLJ./KGhDvm6CfNKeE4Ly', 'BODEGUERO', TRUE, TRUE),
('Comprador', 'comprador@test.com', '$2b$10$XHNr5oBTXe0wGoZsXXNeb.6YQNM2QWLJ./KGhDvm6CfNKeE4Ly', 'COMPRADOR', TRUE, TRUE);