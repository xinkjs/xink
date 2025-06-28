import { readdirSync, lstatSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

/**
 * Generic utility which merges two objects.
 * 
 * @param {any} current
 * @param {any} updates
 * @returns {any}
 */
export const mergeObjects = (current, updates) => {
  if (!current || !updates)
    throw new Error("Both 'current' and 'updates' must be passed-in to merge()")
  if (typeof current !== 'object' || typeof updates !== 'object')
    throw new Error("Both 'current' and 'updates' must be passed-in as objects to merge()")

  let merged = { ...current }

  for (let key of Object.keys(updates)) {
    const current_value = merged[key]
    const update_value = updates[key]

    if (Array.isArray(current_value) && Array.isArray(update_value)) {
      /* Merge arrays. */
      merged[key] = [...new Set([...current_value, ...update_value])]
    } else if (typeof update_value === 'object' && update_value !== null && Array.isArray(update_value) &&
      typeof current_value === 'object' && current_value !== null && !Array.isArray(current_value)) {
      /* Both are non-null, non-array objects, so recurse. */
      merged[key] = mergeObjects(current_value, update_value)
    } else {
      /**
       * Otherwise (primitive, null, or current_value is not an object to merge into),
       * the update value simply overwrites.
       */
      merged[key] = update_value
    }
  }

  return merged
}

/**
 * Recursively reads files from a directory, returning their absolute paths.
 * 
 * @param {string} dir_path The directory to scan.
 * @param {string[]} files_array Accumulator for file paths.
 * @returns {string[]} List of absolute file paths.
 */
function getAllFilesRecursive(dir_path, files_array = []) {
  const files = readdirSync(dir_path)

  for (const file of files) {
    const file_path = join(dir_path, file)
    const stat = lstatSync(file_path)
    if (stat.isDirectory()) {
      files_array = getAllFilesRecursive(file_path, files_array)
    } else {
      files_array.push(file_path)
    }
  }
  return files_array
}

/**
 * Reads files from a directory, optionally filtering by base filename and extensions.
 * This is a generator function to match the original `readFiles` signature.
 *
 * @param {string} base_dir The base directory to scan.
 * @param {{ exact?: boolean, filename?: string, extensions?: string[] }} [options] Filtering options.
 * @returns {Generator<string>} A generator yielding paths relative to the project's CWD.
 */
export function* readFiles(base_dir, options) {
  const cwd = process.cwd()
  const absolute_base_dir = join(cwd, base_dir)

  /* Define default extensions if not provided. */
  const allowed_extensions = options?.extensions ?? ['js', 'ts']
  const filename_to_match = options?.filename

  /* Get all files recursively in the base directory. */
  const all_absolute_file_paths = getAllFilesRecursive(absolute_base_dir)

  for (const absolute_file_path of all_absolute_file_paths) {
    const file_extension = absolute_file_path.split('.').pop()
    const file_base_name = basename(absolute_file_path, `.${file_extension}`)

    /* Filter by extension. */
    if (!allowed_extensions.includes(file_extension)) {
      continue
    }

    /* Filter by exact filename if specified. */
    if (filename_to_match) {
      if (options.exact) {
        /* If exact, the full path must be like baseDir/filename.ext */
        const expected_path_suffix = join(base_dir, `${filename_to_match}.${file_extension}`)
        if (!absolute_file_path.endsWith(expected_path_suffix)) {
          continue
        }
      } else {
        // If not exact, filename can appear anywhere in path structure like **/filename.ext
        if (file_base_name !== filename_to_match) {
          continue
        }
      }
    }
    
    /* Yield path relative to CWD. */
    yield relative(cwd, absolute_file_path)
  }
}
