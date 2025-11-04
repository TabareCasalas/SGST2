-- Script de inicialización de las bases de datos SGST
-- Este archivo se ejecuta automáticamente cuando se crea el contenedor PostgreSQL

-- Crear base de datos para Camunda
CREATE DATABASE camunda_db;

-- Conectar a la base de datos sgst_db
\c sgst_db;

-- Crear extensiones útiles para SGST
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configuraciones adicionales de PostgreSQL
-- (Prisma se encargará de crear las tablas reales)

-- Nota: Camunda creará sus propias tablas en la base de datos camunda_db
-- cuando se inicie el contenedor de Camunda