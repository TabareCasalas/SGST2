const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function consultarDocentes() {
  try {
    console.log('🔍 Consultando docentes en la base de datos...\n');
    
    // Consultar todos los usuarios con rol docente
    const docentes = await prisma.usuario.findMany({
      where: {
        rol: 'docente'
      },
      select: {
        id_usuario: true,
        nombre: true,
        ci: true,
        correo: true,
        activo: true,
        rol: true,
        created_at: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`📊 Total de docentes encontrados: ${docentes.length}\n`);
    
    if (docentes.length === 0) {
      console.log('❌ No se encontraron docentes en la base de datos.');
      console.log('\n💡 Consultando todos los usuarios para ver qué roles existen...\n');
      
      const todosUsuarios = await prisma.usuario.findMany({
        select: {
          id_usuario: true,
          nombre: true,
          ci: true,
          rol: true,
          activo: true
        },
        orderBy: {
          rol: 'asc'
        }
      });
      
      console.log(`📊 Total de usuarios: ${todosUsuarios.length}\n`);
      
      // Agrupar por rol
      const porRol = todosUsuarios.reduce((acc, user) => {
        const rol = user.rol || 'sin_rol';
        if (!acc[rol]) {
          acc[rol] = [];
        }
        acc[rol].push(user);
        return acc;
      }, {});
      
      console.log('📋 Usuarios agrupados por rol:');
      Object.keys(porRol).forEach(rol => {
        console.log(`\n  ${rol}: ${porRol[rol].length} usuario(s)`);
        porRol[rol].forEach(user => {
          console.log(`    - ID: ${user.id_usuario}, Nombre: ${user.nombre}, CI: ${user.ci}, Activo: ${user.activo}`);
        });
      });
    } else {
      console.log('✅ Docentes encontrados:\n');
      docentes.forEach((docente, index) => {
        console.log(`${index + 1}. ID: ${docente.id_usuario}`);
        console.log(`   Nombre: ${docente.nombre}`);
        console.log(`   CI: ${docente.ci}`);
        console.log(`   Correo: ${docente.correo}`);
        console.log(`   Activo: ${docente.activo ? '✅ Sí' : '❌ No'}`);
        console.log(`   Rol: ${docente.rol}`);
        console.log(`   Creado: ${docente.created_at.toLocaleString()}`);
        console.log('');
      });
      
      const activos = docentes.filter(d => d.activo === true);
      const inactivos = docentes.filter(d => d.activo === false);
      
      console.log(`\n📈 Resumen:`);
      console.log(`   ✅ Activos: ${activos.length}`);
      console.log(`   ❌ Inactivos: ${inactivos.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error consultando docentes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

consultarDocentes();


