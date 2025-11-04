const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrarRoles() {
  try {
    console.log('🔄 Iniciando migración de roles...\n');
    
    // Verificar estado antes de la migración
    console.log('📊 Estado ANTES de la migración:');
    const antes = await prisma.$queryRaw`
      SELECT rol, COUNT(*) as cantidad
      FROM "Usuario"
      GROUP BY rol
      ORDER BY rol
    `;
    console.table(antes);
    console.log('');
    
    // PASO 1: Migrar administradores
    console.log('🔄 Migrando administradores...');
    
    const adminSistema = await prisma.$executeRaw`
      UPDATE "Usuario"
      SET rol = 'administrador', nivel_acceso = 3
      WHERE rol = 'administrador_sistema'
    `;
    console.log(`   ✓ administrador_sistema → administrador (nivel 3): ${adminSistema} usuario(s)`);
    
    const adminDocente = await prisma.$executeRaw`
      UPDATE "Usuario"
      SET rol = 'administrador', nivel_acceso = 2
      WHERE rol = 'administrador_docente'
    `;
    console.log(`   ✓ administrador_docente → administrador (nivel 2): ${adminDocente} usuario(s)`);
    
    const adminAdmin = await prisma.$executeRaw`
      UPDATE "Usuario"
      SET rol = 'administrador', nivel_acceso = 1
      WHERE rol = 'administrador_administrativo'
    `;
    console.log(`   ✓ administrador_administrativo → administrador (nivel 1): ${adminAdmin} usuario(s)`);
    
    // PASO 2: Migrar docentes
    console.log('\n🔄 Migrando docentes...');
    
    const docenteResp = await prisma.$executeRaw`
      UPDATE "Usuario"
      SET rol = 'docente'
      WHERE rol = 'docente_responsable'
    `;
    console.log(`   ✓ docente_responsable → docente: ${docenteResp} usuario(s)`);
    
    const docenteAsist = await prisma.$executeRaw`
      UPDATE "Usuario"
      SET rol = 'docente'
      WHERE rol = 'docente_asistente'
    `;
    console.log(`   ✓ docente_asistente → docente: ${docenteAsist} usuario(s)`);
    
    // PASO 3: Verificar migración
    console.log('\n📊 Estado DESPUÉS de la migración:');
    const despues = await prisma.$queryRaw`
      SELECT 
        rol, 
        COUNT(*) as cantidad,
        COUNT(CASE WHEN nivel_acceso IS NOT NULL THEN 1 END) as con_nivel_acceso
      FROM "Usuario"
      GROUP BY rol
      ORDER BY rol
    `;
    console.table(despues);
    
    // Mostrar usuarios con niveles de acceso
    console.log('\n👥 Usuarios administradores con niveles de acceso:');
    const admins = await prisma.usuario.findMany({
      where: {
        rol: 'administrador'
      },
      select: {
        id_usuario: true,
        nombre: true,
        ci: true,
        rol: true,
        nivel_acceso: true
      },
      orderBy: {
        nivel_acceso: 'desc'
      }
    });
    
    admins.forEach(admin => {
      const nivelText = admin.nivel_acceso === 3 ? 'Sistema' :
                       admin.nivel_acceso === 2 ? 'Docente' :
                       admin.nivel_acceso === 1 ? 'Administrativo' : 'Sin nivel';
      console.log(`   - ${admin.nombre} (CI: ${admin.ci}): Nivel ${admin.nivel_acceso} (${nivelText})`);
    });
    
    // Verificar que no queden roles antiguos
    console.log('\n🔍 Verificando roles antiguos...');
    const rolesAntiguos = await prisma.$queryRaw`
      SELECT rol, COUNT(*) as cantidad
      FROM "Usuario"
      WHERE rol IN ('administrador_administrativo', 'administrador_docente', 'administrador_sistema', 
                    'docente_asistente', 'docente_responsable')
      GROUP BY rol
    `;
    
    if (Array.isArray(rolesAntiguos) && rolesAntiguos.length === 0) {
      console.log('   ✅ No quedan roles antiguos en la base de datos');
    } else {
      console.log('   ⚠️  Aún existen roles antiguos:');
      console.table(rolesAntiguos);
    }
    
    console.log('\n✅ Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrarRoles();

