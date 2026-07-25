ALTER TABLE cotizaciones ADD COLUMN solicitud_compra_id INTEGER NULL;
ALTER TABLE cotizaciones ADD CONSTRAINT FK_cotizacion_solicitud
  FOREIGN KEY (solicitud_compra_id) REFERENCES solicitudes_compra(id) ON DELETE SET NULL;
