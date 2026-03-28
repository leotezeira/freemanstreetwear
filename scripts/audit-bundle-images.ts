/**
 * Script de Auditoría: Imágenes de Bundles
 * 
 * Verifica que todos los filePath en la DB existan en el bucket de Supabase Storage.
 * 
 * USO:
 * npx tsx scripts/audit-bundle-images.ts
 * 
 * REQUERIMIENTOS:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditBundleImages() {
  console.log('🔍 Iniciando auditoría de imágenes de bundles...\n');

  // Paso 1: Obtener todos los bundles con image_path
  const { data: bundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, name, image_path')
    .order('created_at', { ascending: false });

  if (bundlesError) {
    console.error('❌ Error al obtener bundles:', bundlesError.message);
    return;
  }

  console.log(`📦 Bundles encontrados: ${bundles.length}\n`);

  // Paso 2: Listar archivos reales en el bucket
  const { data: filesData, error: listError } = await supabase.storage
    .from('bundle-images')
    .list('bundles', { limit: 1000 });

  if (listError) {
    console.error('❌ Error al listar archivos del bucket:', listError.message);
    console.log('💡 Verifica que el bucket "bundle-images" exista y tenga políticas RLS correctas');
    return;
  }

  const existingFiles = new Set(filesData?.map(f => `bundles/${f.name}`) || []);
  console.log(`📁 Archivos reales en bucket: ${existingFiles.size}\n`);

  // Paso 3: Comparar y detectar inconsistencias
  const validBundles: typeof bundles = [];
  const missingFiles: typeof bundles = [];
  const nullImages: typeof bundles = [];
  const invalidFormat: typeof bundles = [];

  for (const bundle of bundles) {
    if (!bundle.image_path) {
      nullImages.push(bundle);
    } else if (!bundle.image_path.startsWith('bundles/')) {
      invalidFormat.push(bundle);
    } else if (existingFiles.has(bundle.image_path)) {
      validBundles.push(bundle);
    } else {
      missingFiles.push(bundle);
    }
  }

  // Paso 4: Mostrar resultados
  console.log('='.repeat(60));
  console.log('📊 RESULTADOS DE LA AUDITORÍA');
  console.log('='.repeat(60));

  console.log(`\n✅ VÁLIDOS: ${validBundles.length}`);
  if (validBundles.length > 0) {
    validBundles.forEach(b => console.log(`   ✓ ${b.name} (${b.image_path})`));
  }

  console.log(`\n⚠️  SIN IMAGEN: ${nullImages.length}`);
  if (nullImages.length > 0) {
    nullImages.forEach(b => console.log(`   - ${b.name}`));
  }

  console.log(`\n❌ FORMATO INVÁLIDO: ${invalidFormat.length}`);
  if (invalidFormat.length > 0) {
    invalidFormat.forEach(b => console.log(`   ✗ ${b.name}: ${b.image_path}`));
  }

  console.log(`\n🚨 ARCHIVOS FALTANTES: ${missingFiles.length}`);
  if (missingFiles.length > 0) {
    missingFiles.forEach(b => console.log(`   🚫 ${b.name}: ${b.image_path}`));
  }

  // Paso 5: Recomendaciones
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMENDACIONES');
  console.log('='.repeat(60));

  if (missingFiles.length > 0) {
    console.log('\n🔴 ACCIÓN REQUERIDA:');
    console.log(`   ${missingFiles.length} bundles tienen archivos faltantes.`);
    console.log('\n   Opciones:');
    console.log('   1. Ejecutar corrección automática (set image_path = NULL)');
    console.log('   2. Re-subir las imágenes manualmente');
    console.log('   3. Verificar si el bucket es correcto');
  }

  if (invalidFormat.length > 0) {
    console.log('\n🟡 FORMATO INVÁLIDO:');
    console.log(`   ${invalidFormat.length} bundles tienen URLs en lugar de filePath.`);
    console.log('   Ejecutar: data/migrate-bundle-images.sql');
  }

  if (nullImages.length > 0) {
    console.log('\n🟢 SIN IMAGEN:');
    console.log(`   ${nullImages.length} bundles sin imagen (no requiere acción).`);
  }

  // Paso 6: Ofrecer corrección automática
  if (missingFiles.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 ¿EJECUTAR CORRECCIÓN AUTOMÁTICA?');
    console.log('='.repeat(60));
    console.log('Esto seteará image_path = NULL para los bundles con archivos faltantes.');
    console.log('⚠️  Esta acción NO se puede deshacer automáticamente.');
    console.log('\n   Para ejecutar manualmente:');
    console.log('   UPDATE bundles SET image_path = NULL WHERE id IN (');
    console.log(`     ${missingFiles.map(b => `'${b.id}'`).join(', ')}\n   );`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Auditoría completada');
  console.log('='.repeat(60));
}

// Ejecutar auditoría
auditBundleImages().catch(err => {
  console.error('❌ Error en auditoría:', err);
  process.exit(1);
});
