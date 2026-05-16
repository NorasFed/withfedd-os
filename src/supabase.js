import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://qnatlzfyflzeywqdxhwb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYXRsemZ5Zmx6ZXl3cWR4aHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTAyNTcsImV4cCI6MjA5NDM2NjI1N30.8qbb2JiQbvYD1T2NyLQPkzTDpfHLO_wjNWyRsyvEdVg'
)

export async function dbFetchProjects(userId) {
  const { data, error } = await supabase
    .from('projects').select('id, name, color').eq('user_id', userId).order('created_at')
  if (error) console.error('fetchProjects', error)
  return data || []
}

export async function dbUpsertProject(userId, { id, name, color }) {
  const { error } = await supabase.from('projects').upsert({ id, name, color, user_id: userId })
  if (error) console.error('upsertProject', error)
}

export async function dbDeleteProject(userId, projectId) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('user_id', userId)
  if (error) console.error('deleteProject', error)
}

export async function dbFetchStatuses(userId, projectId) {
  const { data, error } = await supabase
    .from('statuses').select('item_key, status').eq('user_id', userId).eq('project_id', projectId)
  if (error) console.error('fetchStatuses', error)
  return new Map((data || []).map(r => [r.item_key, r.status]))
}

export async function dbSetStatus(userId, projectId, itemKey, status) {
  if (status === 'todo') {
    const { error } = await supabase.from('statuses').delete()
      .eq('user_id', userId).eq('project_id', projectId).eq('item_key', itemKey)
    if (error) console.error('deleteStatus', error)
  } else {
    const { error } = await supabase.from('statuses').upsert({
      user_id: userId, project_id: projectId, item_key: itemKey, status,
      updated_at: new Date().toISOString()
    })
    if (error) console.error('upsertStatus', error)
  }
}

export async function dbUpsertStatuses(userId, projectId, statusesMap) {
  const rows = []
  statusesMap.forEach((status, item_key) => {
    if (status !== 'todo') rows.push({
      user_id: userId, project_id: projectId, item_key, status,
      updated_at: new Date().toISOString()
    })
  })
  if (!rows.length) return
  const { error } = await supabase.from('statuses').upsert(rows)
  if (error) console.error('upsertStatuses', error)
}

export async function dbSaveResponse(data) {
  const { error } = await supabase
    .from('questionnaire_responses')
    .insert({ data, submitted_at: new Date().toISOString() })
  if (error) console.error('saveResponse', error)
  return !error
}

export async function dbFetchResponses() {
  const { data, error } = await supabase
    .from('questionnaire_responses')
    .select('id, submitted_at, data')
    .order('submitted_at', { ascending: false })
  if (error) console.error('fetchResponses', error)
  return data || []
}
