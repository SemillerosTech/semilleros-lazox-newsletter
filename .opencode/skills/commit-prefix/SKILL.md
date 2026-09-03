---
name: commit-prefix
description: Use ONLY when committing and pushing code. Enforces feat: prefix for commit messages and git push workflow for SemillerosLazox projects.
---

# Commit Prefix — feat:

Este skill asegura que **todo commit con push** use el prefijo `feat:` como estándar del proyecto.

## Cuándo activar
- El usuario pide `commit`, `commit y push`, `haz el commit`, `push`, `guardar cambios`, o cualquier variante.
- Antes de ejecutar `git commit` o `git push`.

## Reglas obligatorias
1. **Prefijo obligatorio:** Todo mensaje de commit DEBE empezar con `feat: ` (ej: `feat: descripción corta`).
   - Si el usuario da un mensaje sin prefijo, anteponer `feat: ` automáticamente.
   - Si ya trae `feat:`, `fix:`, `docs:`, etc., normalizar a `feat:` a menos que el usuario pida explícitamente otro prefijo.
2. **Workflow:**
   ```bash
   git status
   git diff --stat
   git add <archivos relevantes>
   git commit -m "feat: <descripción>"
   git push
   ```
3. **Idioma:** Respetar el idioma del usuario para la descripción, pero mantener `feat:` en minúsculas.
4. **Verificación:** Antes de commit, inspeccionar `git status` y `git diff` para incluir solo archivos intencionados.

## Ejemplo
Usuario: "haz el commit y el push de los cambios"
→ `git commit -m "feat: fix sequence desync handling for form_silee"`

> Este skill tiene prioridad sobre convenciones por defecto. No preguntar si usar `feat:`, aplicarlo directamente y notificar al usuario.
