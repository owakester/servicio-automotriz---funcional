import { useNotifications } from './useNotifications'

export const useBackupCompression = () => {
  const { success, error } = useNotifications()

  // 🗜️ COMPRIMIR DATOS JSON USANDO GZIP NATIVO DEL NAVEGADOR
  const comprimirDatos = async (datos) => {
    try {
      // Convertir datos a JSON string
      const jsonString = JSON.stringify(datos, null, 2)
      
      // Convertir string a Uint8Array
      const encoder = new TextEncoder()
      const input = encoder.encode(jsonString)
      
      // Comprimir usando CompressionStream (disponible en navegadores modernos)
      if ('CompressionStream' in window) {
        const compressionStream = new CompressionStream('gzip')
        const writer = compressionStream.writable.getWriter()
        const reader = compressionStream.readable.getReader()
        
        // Escribir datos
        writer.write(input)
        writer.close()
        
        // Leer datos comprimidos
        const chunks = []
        let done = false
        
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) {
            chunks.push(value)
          }
        }
        
        // Combinar chunks
        const compressedSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const compressed = new Uint8Array(compressedSize)
        let offset = 0
        
        for (const chunk of chunks) {
          compressed.set(chunk, offset)
          offset += chunk.length
        }
        
        const compressionRatio = ((1 - (compressed.length / input.length)) * 100).toFixed(1)
        
        console.log(`📦 Compresión exitosa: ${input.length} bytes → ${compressed.length} bytes (${compressionRatio}% reducción)`)
        
        return {
          success: true,
          compressedData: compressed,
          originalSize: input.length,
          compressedSize: compressed.length,
          compressionRatio: parseFloat(compressionRatio),
          metadata: {
            algorithm: 'gzip',
            timestamp: new Date().toISOString(),
            originalFormat: 'json'
          }
        }
      } else {
        // Fallback: usar LZ-string como alternativa más simple
        console.log('⚠️ CompressionStream no disponible, usando compresión simple')
        return comprimirConLZString(jsonString)
      }
    } catch (err) {
      console.error('❌ Error al comprimir datos:', err)
      error('Error al comprimir el backup')
      return { success: false, error: err.message }
    }
  }

  // 🗜️ DESCOMPRIMIR DATOS
  const descomprimirDatos = async (compressedData, metadata = null) => {
    try {
      if (metadata?.algorithm === 'gzip' && 'DecompressionStream' in window) {
        // Descomprimir usando DecompressionStream
        const decompressionStream = new DecompressionStream('gzip')
        const writer = decompressionStream.writable.getWriter()
        const reader = decompressionStream.readable.getReader()
        
        // Escribir datos comprimidos
        writer.write(compressedData)
        writer.close()
        
        // Leer datos descomprimidos
        const chunks = []
        let done = false
        
        while (!done) {
          const { value, done: readerDone } = await reader.read()
          done = readerDone
          if (value) {
            chunks.push(value)
          }
        }
        
        // Combinar chunks
        const decompressedSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const decompressed = new Uint8Array(decompressedSize)
        let offset = 0
        
        for (const chunk of chunks) {
          decompressed.set(chunk, offset)
          offset += chunk.length
        }
        
        // Convertir a string y parsear JSON
        const decoder = new TextDecoder()
        const jsonString = decoder.decode(decompressed)
        const datos = JSON.parse(jsonString)
        
        console.log(`📦 Descompresión exitosa: ${compressedData.length} bytes → ${decompressed.length} bytes`)
        
        return {
          success: true,
          data: datos,
          originalSize: compressedData.length,
          decompressedSize: decompressed.length
        }
      } else {
        // Fallback para LZ-string
        return descomprimirDesdeLZString(compressedData)
      }
    } catch (err) {
      console.error('❌ Error al descomprimir datos:', err)
      error('Error al descomprimir el backup')
      return { success: false, error: err.message }
    }
  }

  // 🗜️ FALLBACK: Compresión simple usando algoritmo LZ básico
  const comprimirConLZString = (jsonString) => {
    try {
      // Implementación básica de compresión LZ
      const compressed = simpleCompress(jsonString)
      const compressionRatio = ((1 - (compressed.length / jsonString.length)) * 100).toFixed(1)
      
      return {
        success: true,
        compressedData: compressed,
        originalSize: jsonString.length,
        compressedSize: compressed.length,
        compressionRatio: parseFloat(compressionRatio),
        metadata: {
          algorithm: 'lz-simple',
          timestamp: new Date().toISOString(),
          originalFormat: 'json'
        }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 🗜️ FALLBACK: Descomprimir LZ-string
  const descomprimirDesdeLZString = (compressedData) => {
    try {
      const jsonString = simpleDecompress(compressedData)
      const datos = JSON.parse(jsonString)
      
      return {
        success: true,
        data: datos,
        originalSize: compressedData.length,
        decompressedSize: jsonString.length
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 🛠️ ALGORITMO DE COMPRESIÓN SIMPLE
  const simpleCompress = (str) => {
    const dict = new Map()
    const result = []
    let dictSize = 256
    let w = ""

    // Inicializar diccionario con caracteres ASCII
    for (let i = 0; i < 256; i++) {
      dict.set(String.fromCharCode(i), i)
    }

    for (let i = 0; i < str.length; i++) {
      const c = str[i]
      const wc = w + c

      if (dict.has(wc)) {
        w = wc
      } else {
        result.push(dict.get(w))
        dict.set(wc, dictSize++)
        w = c
      }
    }

    if (w) {
      result.push(dict.get(w))
    }

    // Convertir a string compacto
    return result.map(code => String.fromCharCode(code)).join('')
  }

  // 🛠️ ALGORITMO DE DESCOMPRESIÓN SIMPLE
  const simpleDecompress = (compressed) => {
    const dict = []
    let dictSize = 256
    let w = ""
    let result = ""

    // Inicializar diccionario
    for (let i = 0; i < 256; i++) {
      dict[i] = String.fromCharCode(i)
    }

    const codes = compressed.split('').map(char => char.charCodeAt(0))

    for (let i = 0; i < codes.length; i++) {
      const k = codes[i]
      let entry = ""

      if (dict[k]) {
        entry = dict[k]
      } else if (k === dictSize) {
        entry = w + w[0]
      } else {
        throw new Error("Datos comprimidos corruptos")
      }

      result += entry

      if (w) {
        dict[dictSize++] = w + entry[0]
      }

      w = entry
    }

    return result
  }

  // 📊 GENERAR ESTADÍSTICAS DE COMPRESIÓN
  const obtenerEstadisticasCompresion = (originalSize, compressedSize) => {
    const compressionRatio = ((1 - (compressedSize / originalSize)) * 100).toFixed(1)
    const spaceSaved = originalSize - compressedSize
    
    return {
      originalSize: formatBytes(originalSize),
      compressedSize: formatBytes(compressedSize),
      spaceSaved: formatBytes(spaceSaved),
      compressionRatio: `${compressionRatio}%`
    }
  }

  // 🛠️ FORMATEAR BYTES
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 🧪 PROBAR COMPRESIÓN
  const probarCompresion = async (datos) => {
    console.log('🧪 Probando compresión...')
    const resultado = await comprimirDatos(datos)
    
    if (resultado.success) {
      const estadisticas = obtenerEstadisticasCompresion(
        resultado.originalSize, 
        resultado.compressedSize
      )
      
      console.log('📊 Estadísticas de compresión:', estadisticas)
      return estadisticas
    }
    
    return null
  }

  return {
    comprimirDatos,
    descomprimirDatos,
    obtenerEstadisticasCompresion,
    probarCompresion,
    formatBytes
  }
}
