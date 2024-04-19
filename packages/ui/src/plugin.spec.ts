// @vitest-environment edge-runtime

import { test, expect } from 'vitest'
import { createRequestContextForPlugin, usePlugin } from './plugin'
import { CollectionItem } from './global'

function createExpose() {
    const request: CollectionItem = {
        _id: 'test',
        _type: 'request',
        parentId: 'test',
        workspaceId: 'test',
        name: 'test',
    }
    const environment: any = {}
    const setEnvironmentVariable = (key: string, value: string) => {
        environment[key] = value
    }
    const state = {
        testResults: []
    }

    const { expose } = createRequestContextForPlugin(request, environment, setEnvironmentVariable, state.testResults)

    return { expose, environment }
}

test('import crypto-js from esm.sh', async() => {
    const { expose, environment } = createExpose()

    await usePlugin(expose, {
        name: 'Test Plugin',
        code: `
            import CryptoJS from 'https://esm.sh/crypto-js@latest?target=es2020'

            var data = "cat"

            // Encrypt
            var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), 'secret key 123').toString();

            // Decrypt
            var bytes  = CryptoJS.AES.decrypt(ciphertext, 'secret key 123');
            var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

            rf.setEnvVar('decryptedText', decryptedData)
        `,
        parentPathForReadFile: null,
    })

    expect(environment.decryptedText).toBe('cat')
})

test('import pako from unpkg.com', async() => {
    const { expose, environment } = createExpose()

    const code = JSON.parse(JSON.stringify(`
        import pako from 'https://unpkg.com/pako@2.1.0/dist/pako.esm.mjs?module'
        // this doesn't work as intended, because atob returns 1 character instead of 40 - bug in quickjs-emscripten
        // See: https://stackblitz.com/edit/quickjs-emscripten-newstring-bug?file=main.js&terminal=dev
        // const buffer = rf.base64.toArrayBuffer('EAAAAB+LCAAAAAAAAAqrVvLMKy5JzEtOLVayio6tBQCx9ZeKEAAAAA==')
        // temporary alternative, we put the atob converted 40 character string here, do the base64 to buffer conversion ourselves {
        const binaryString = \`\x10\x00\x00\x00\x1F\x8B\b\x00\x00\x00\x00\x00\x00\n«VòÌ+.IÌKN-V²\x8A\x8E­\x05\x00±õ\x97\x8A\x10\x00\x00\x00\`
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        const buffer = bytes.buffer
        // }
        const slicedBuffer = buffer.slice(4)
        const decompressedGzip = pako.inflate(slicedBuffer)
        const result = rf.arrayBuffer.toString(decompressedGzip)
        rf.setEnvVar('result', result)
    `))

    await usePlugin(expose, {
        name: 'Test Plugin',
        code,
        parentPathForReadFile: null,
    })

    expect(environment.result).toBe('{"Instances":[]}')
})