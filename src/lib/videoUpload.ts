import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { storage, auth } from './firebase';

/**
 * Uploads video files directly to Google Cloud / Firebase Storage for global student access.
 * Implements anonymous authentication, stagnation detection, and server fallback so progress never freezes.
 */
export async function uploadVideoFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!file) throw new Error('Nenhum arquivo de vídeo foi selecionado.');

  const finishProgress = (url: string) => {
    if (onProgress) onProgress(100);
    return url;
  };

  if (onProgress) onProgress(5);

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `class_videos/${Date.now()}_${cleanName}`;

  // Ensure Firebase Auth is signed in anonymously before attempting Storage upload
  if (auth && !auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn('[VideoUpload] Falha ao autenticar anonimamente no Firebase:', e);
    }
  }

  // 1. PRIMARY STRATEGY: Firebase Cloud Storage (Google Cloud)
  if (storage) {
    try {
      console.log('[VideoUpload] Iniciando upload no Firebase Storage...', storagePath);
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'video/mp4',
      });

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        let hasTransferredBytes = false;

        // Stagnation guard: If 6 seconds pass with 0 bytes transferred, cancel and fallback
        const stagnationTimer = setTimeout(() => {
          if (!hasTransferredBytes) {
            console.warn('[VideoUpload] Stagnation detectada (0% após 6s). Cancelando Firebase Storage...');
            uploadTask.cancel();
            reject(new Error('Firebase Storage estagnado em 0%'));
          }
        }, 6000);

        // Overall safety timeout (5 minutes)
        const maxTimeout = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Tempo limite excedido no envio para o Firebase Storage.'));
        }, 300000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > 0) {
              hasTransferredBytes = true;
              clearTimeout(stagnationTimer);
            }
            if (snapshot.totalBytes > 0 && onProgress) {
              const percent = Math.min(99, Math.max(5, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)));
              onProgress(percent);
            }
          },
          (error) => {
            clearTimeout(stagnationTimer);
            clearTimeout(maxTimeout);
            console.warn('[VideoUpload] Erro no Firebase Storage:', error);
            reject(error);
          },
          async () => {
            clearTimeout(stagnationTimer);
            clearTimeout(maxTimeout);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('[VideoUpload] Vídeo salvo na nuvem com SUCESSO:', url);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      if (downloadUrl) {
        return finishProgress(downloadUrl);
      }
    } catch (firebaseErr) {
      console.warn('[VideoUpload] Falha no Firebase Storage, tentando servidor de retaguarda...', firebaseErr);
    }
  }

  // 2. SECONDARY STRATEGY: Direct Server Backend Endpoint (/api/upload-video)
  try {
    console.log('[VideoUpload] Tentando upload no servidor backend...');
    const serverUrl = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const uploadUrl = `/api/upload-video?filename=${encodeURIComponent(file.name)}`;

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.timeout = 120000; // 2 minutes

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const percent = Math.min(99, Math.max(5, Math.round((e.loaded / e.total) * 100)));
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.url) {
              const fullUrl = response.url.startsWith('http')
                ? response.url
                : `${window.location.origin}${response.url}`;
              resolve(fullUrl);
              return;
            }
          } catch (e) {}
        }
        reject(new Error(`Servidor respondeu com código ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error('Erro de conexão com o servidor.'));
      xhr.ontimeout = () => reject(new Error('Tempo limite do servidor excedido.'));

      xhr.send(file);
    });

    if (serverUrl) {
      return finishProgress(serverUrl);
    }
  } catch (serverErr) {
    console.warn('[VideoUpload] Servidor backend indisponível para upload:', serverErr);
  }

  // 3. TERTIARY STRATEGY: Base64 Data URL (for small/medium videos <= 3MB)
  if (file.size <= 3 * 1024 * 1024) {
    console.log('[VideoUpload] Processando arquivo local em formato Data URL...');
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0 && onProgress) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          onProgress(percent);
        }
      };

      reader.onload = () => {
        const result = reader.result as string;
        finishProgress(result);
        resolve(result);
      };

      reader.onerror = () => reject(new Error('Falha ao processar arquivo de vídeo.'));
      reader.readAsDataURL(file);
    });
  }

  // If all cloud methods failed and file is too large for Firestore string limit
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  throw new Error(
    `O arquivo de vídeo selecionado (${fileSizeMB} MB) não pôde ser enviado para a nuvem. Para garantir que todos os alunos consigam assistir sem travar, cole o link do YouTube, Instagram ou Google Drive.`
  );
}
