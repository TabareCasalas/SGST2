const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function consultarRoles() {
  try {
    console.log('🔍 Consultando roles en la base de datos...\n');
    
    // Consultar todos los usuarios para agrupar por rol
    const usuarios = await prisma.usuario.findMany({
      select: {
        id_usuario: true,
        nombre: true,
        ci: true,
        correo: true,
        rol: true,
        nivel_acceso: true,
        activo: true
      },
      orderBy: {
        rol: 'asc'
      }
    });

    console.log(`📊 Total de usuarios: ${usuarios.length}\n`);

    // Agrupar por rol y nivel_acceso
    const porRol = usuarios.reduce((acc, user) => {
      const rol = user.rol || 'sin_rol';
      const clave = rol + (user.nivel_acceso ? `_nivel${user.nivel_acceso}` : '');
      
      if (!acc[rol]) {
        acc[rol] = {
          total: 0,
          activos: 0,
          inactivos: 0,
          niveles: {},
          usuarios: []
        };
      }
      
      acc[rol].total++;
      if (user.activo) {
        acc[rol].activos++;
      } else {
        acc[rol].inactivos++;
      }
      
      // Agrupar por nivel_acceso
      const nivelKey = user.nivel_acceso ? `Nivel ${user.nivel_acceso}` : 'Sin nivel';
      if (!acc[rol].niveles[nivelKey]) {
        acc[rol].niveles[nivelKey] = 0;
      }
      acc[rol].niveles[nivelKey]++;
      
      acc[rol].usuarios.push(user);
      return acc;
    }, {});

    console.log('📋 Roles encontrados en la base de datos:\n');
    console.log('═'.repeat(80));
    
    Object.keys(porRol).sort().forEach(rol => {
      const info = porRol[rol];
      console.log(`\n🔹 Rol: "${rol}"`);
      console.log(`   Total usuarios: ${info.total}`);
      console.log(`   ✅ Activos: ${info.activos}`);
      console.log(`   ❌ Inactivos: ${info.inactivos}`);
      
      // Mostrar niveles de acceso si existen
      const nivelesKeys = Object.keys(info.niveles);
      if (nivelesKeys.length > 0 && nivelesKeys[0] !== 'Sin nivel') {
        console.log(`   📊 Niveles de acceso:`);
        nivelesKeys.forEach(nivel => {
          console.log(`      - ${nivel}: ${info.niveles[nivel]} usuario(s)`);
        });
      }
      
      // Mostrar algunos ejemplos de usuarios
      console.log(`   👥 Ejemplos de usuarios:`);
      info.usuarios.slice(0, 5).forEach(user => {
        const nivelInfo = user.nivel_acceso ? ` [Nivel ${user.nivel_acceso}]` : '';
        const estado = user.activo ? '✅' : '❌';
        console.log(`      ${estado} ${user.nombre} (CI: ${user.ci})${nivelInfo}`);
      });
      if (info.usuarios.length > 5) {
        console.log(`      ... y ${info.usuarios.length - 5} más`);
      }
    });

    console.log('\n' + '═'.repeat(80));
    
    // Resumen estadístico
    console.log('\n📈 Resumen estadístico:');
    console.log(`   Total de roles únicos: ${Object.keys(porRol).length}`);
    console.log(`   Roles encontrados: ${Object.keys(porRol).sort().join(', ')}`);
    
    // Verificar roles esperados vs encontrados
    const rolesEsperados = ['estudiante', 'docente', 'consultante', 'administrador'];
    const rolesEncontrados = Object.keys(porRol);
    const rolesNoEsperados = rolesEncontrados.filter(r => !rolesEsperados.includes(r));
    
    if (rolesNoEsperados.length > 0) {
      console.log(`\n⚠️  Advertencia: Se encontraron roles no esperados:`);
      rolesNoEsperados.forEach(rol => {
        console.log(`   - "${rol}": ${porRol[rol].total} usuario(s)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error consultando roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

consultarRoles();

