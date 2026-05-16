import { supabase } from './supabase.js'

document.getElementById('questionnaire').addEventListener('submit', async function (e) {
  e.preventDefault()

  // Clear all previous errors
  document.querySelectorAll('.q-block.has-error').forEach(el => el.classList.remove('has-error'))

  let firstError = null

  // Validate each required q-block
  document.querySelectorAll('[data-required]').forEach(block => {
    const type = block.dataset.required
    let invalid = false

    if (type === 'action-checkbox') {
      const checked = block.querySelectorAll('input[type=checkbox]:checked')
      if (checked.length === 0) invalid = true
    } else if (type === 'ambiance-radio') {
      const checked = block.querySelector('input[type=radio]:checked')
      if (!checked) invalid = true
    } else if (type === 'email') {
      const input = block.querySelector('input[type=email]')
      const val = input ? input.value.trim() : ''
      if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) invalid = true
    } else {
      const input = block.querySelector('input, textarea')
      if (!input || !input.value.trim()) invalid = true
    }

    if (invalid) {
      block.classList.add('has-error')
      if (!firstError) firstError = block
    }
  })

  // Stop and scroll to first error
  if (firstError) {
    const offset = firstError.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top: offset, behavior: 'smooth' })
    return
  }

  // Collect all form data into a plain object
  const fd = new FormData(this)
  const data = {}

  // Collect multi-value fields (checkboxes with [])
  const multiFields = {}
  for (const [key, value] of fd.entries()) {
    if (key.endsWith('[]')) {
      const cleanKey = key.slice(0, -2)
      if (!multiFields[cleanKey]) multiFields[cleanKey] = []
      multiFields[cleanKey].push(value)
    } else {
      data[key] = value
    }
  }
  // Merge multi-value fields
  Object.assign(data, multiFields)

  // Submit
  const btn = document.getElementById('btn-submit')
  btn.textContent = 'Envoi…'
  btn.disabled = true

  const { error } = await supabase
    .from('questionnaire_responses')
    .insert({ data, submitted_at: new Date().toISOString() })

  if (error) {
    console.error('Supabase insert error:', error)
    btn.textContent = 'Envoyer mes réponses'
    btn.disabled = false
    alert('Une erreur est survenue. Vérifiez votre connexion et réessayez.')
    return
  }

  // Success
  document.getElementById('form-view').style.display = 'none'
  document.getElementById('success-view').style.display = 'block'
  document.getElementById('progress-bar').style.width = '100%'
  window.scrollTo({ top: 0, behavior: 'smooth' })
})
