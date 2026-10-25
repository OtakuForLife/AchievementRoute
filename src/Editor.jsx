import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTION_TYPES, ITEM_TYPES, validateGame } from './route.js'
import { blankAchievement, blankAction, saveGameFile, uniqueId, writeAction } from './editGame.js'

const SECTIONS = [
  ['areas', 'Areas'],
  ['items', 'Items'],
  ['enemies', 'Enemies'],
  ['results', 'Results'],
  ['actions', 'Actions'],
  ['achievements', 'Achievements'],
]

// Survives leaving the tab. Keyed by filename, not id — the id is editable.
const bags = new Map()

function takeBag(file, game) {
  const existing = bags.get(file)
  if (existing) return existing
  const created = { draft: structuredClone(game), section: 'areas', query: '', selected: 0 }
  bags.set(file, created)
  return created
}

function hit(row, query) {
  if (!query) return true
  return `${row.id ?? ''} ${row.name ?? ''} ${row.description ?? ''} ${row.type ?? ''}`
    .toLowerCase()
    .includes(query)
}

function optionLabel(row) {
  if (row.name && row.name !== row.id) return `${row.name} (${row.id})`
  return row.id || '(no id)'
}

export default function Editor({ game, file, otherIds, onSaved }) {
  const initial = takeBag(file, game)
  const [draft, setDraft] = useState(initial.draft)
  const [section, setSection] = useState(initial.section)
  const [query, setQuery] = useState(initial.query)
  const [selected, setSelected] = useState(initial.selected)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const fileRef = useRef(file)
  const snap = useRef({ draft, section, query, selected })
  snap.current = { draft, section, query, selected }

  if (fileRef.current !== file) {
    bags.set(fileRef.current, { ...snap.current })
    fileRef.current = file
    const next = takeBag(file, game)
    setDraft(next.draft)
    setSection(next.section)
    setQuery(next.query)
    setSelected(next.selected)
    setSaveError('')
    setNotice('')
  }

  useEffect(() => {
    return () => {
      bags.set(fileRef.current, { ...snap.current })
    }
  }, [])

  const taken = otherIds.join('\n')
  const issue = useMemo(() => {
    if (draft.id && taken.split('\n').includes(draft.id)) return 'Another loaded game already uses this id.'
    return validateGame(draft)
  }, [draft, taken])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(game), [draft, game])
  const q = query.trim().toLowerCase()
  const rows = draft[section] ?? []
  const currentIndex = rows.length === 0 ? -1 : Math.min(selected, rows.length - 1)
  const current = currentIndex >= 0 ? rows[currentIndex] : null

  function patchList(key, index, nextRow) {
    setDraft((currentDraft) => {
      const list = (currentDraft[key] ?? []).slice()
      list[index] = nextRow
      return { ...currentDraft, [key]: list }
    })
    setNotice('')
  }

  function removeFrom(key, index) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: (currentDraft[key] ?? []).filter((_, i) => i !== index),
    }))
    setSelected((value) => (value > index ? value - 1 : value))
    setNotice('')
  }

  function addRow() {
    const next = appendRow(draft, section)
    setQuery('')
    setNotice('')
    setDraft(next)
    setSelected((next[section] ?? []).length - 1)
  }

  function revert() {
    setDraft(structuredClone(game))
    setSaveError('')
    setNotice('')
  }

  async function save() {
    if (!dirty || issue || saving || !file) return
    setSaving(true)
    setSaveError('')
    try {
      const next = structuredClone(draft)
      await saveGameFile(file, next)
      onSaved(next)
      setNotice('Saved')
    } catch (error) {
      setSaveError(error?.message || 'Could not save the game.')
    } finally {
      setSaving(false)
    }
  }

  const split = section === 'actions' || section === 'achievements'

  return (
    <div className="editor">
      <div className="editor-bar">
        <label className="field">
          Id
          <input
            value={draft.id ?? ''}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setDraft((currentDraft) => ({ ...currentDraft, id: event.target.value }))
              setNotice('')
            }}
          />
        </label>
        <label className="field grow">
          Name
          <input
            value={draft.name ?? ''}
            autoComplete="off"
            onChange={(event) => {
              setDraft((currentDraft) => ({ ...currentDraft, name: event.target.value }))
              setNotice('')
            }}
          />
        </label>
        <div className="editor-tools">
          <span className="file-name">{file}</span>
          <button type="button" className="copy" onClick={revert} disabled={!dirty || saving}>
            Revert
          </button>
          <button type="button" className="save" onClick={save} disabled={!dirty || Boolean(issue) || saving || !file}>
            {saving ? 'Saving…' : notice || 'Save'}
          </button>
        </div>
      </div>

      {(issue || saveError) && (
        <p className="warning editor-issue" role="status">
          {saveError || issue}
        </p>
      )}

      <div className="section-switch" aria-label="Data sections">
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={section === key ? 'on' : undefined}
            aria-pressed={section === key}
            onClick={() => {
              setSection(key)
              setQuery('')
              setSelected(0)
            }}
          >
            {label}
            <span className="switch-count">{(draft[key] ?? []).length}</span>
          </button>
        ))}
      </div>

      <div className={split ? 'editor-body split-body' : 'editor-body'}>
        {split ? (
          <div className="split">
            <div className="split-list">
              <ListHead query={query} onQuery={setQuery} onAdd={addRow} />
              <ul className="pick-list">
                {rows.map((row, index) =>
                  hit(row, q) ? (
                    <li key={index}>
                      <button
                        type="button"
                        className={index === currentIndex ? 'pick on' : 'pick'}
                        onClick={() => setSelected(index)}
                      >
                        <span className="pick-id">
                          {section === 'achievements' ? row.name || row.id || '(untitled)' : row.id || '(no id)'}
                        </span>
                        <span className="pick-desc">{row.description}</span>
                      </button>
                    </li>
                  ) : null,
                )}
              </ul>
              {current && q && !hit(current, q) && <p className="pick-hidden">Selected row is hidden by search.</p>}
            </div>
            <div className="detail">
              {!current && <p className="waiting">Nothing in this list yet.</p>}
              {current && section === 'actions' && (
                <ActionForm
                  action={current}
                  areas={draft.areas ?? []}
                  items={draft.items ?? []}
                  enemies={draft.enemies ?? []}
                  results={draft.results ?? []}
                  actions={draft.actions ?? []}
                  onChange={(partial) => patchList('actions', currentIndex, writeAction({ ...current, ...partial }))}
                  onRemove={() => removeFrom('actions', currentIndex)}
                />
              )}
              {current && section === 'achievements' && (
                <AchievementForm
                  achievement={current}
                  actions={draft.actions ?? []}
                  achievements={draft.achievements ?? []}
                  onChange={(partial) => patchList('achievements', currentIndex, { ...current, ...partial })}
                  onRemove={() => removeFrom('achievements', currentIndex)}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <ListHead query={query} onQuery={setQuery} onAdd={addRow} />
            <EntityTable
              kind={section}
              rows={rows}
              query={q}
              onPatch={(index, partial) => patchList(section, index, { ...rows[index], ...partial })}
              onRemove={(index) => removeFrom(section, index)}
            />
          </>
        )}
      </div>
    </div>
  )
}

function ListHead({ query, onQuery, onAdd }) {
  return (
    <div className="editor-subhead">
      <label className="search-field">
        <span className="sr-only">Search this list</span>
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      <button type="button" className="copy" onClick={onAdd}>
        Add
      </button>
    </div>
  )
}

function EntityTable({ kind, rows, query, onPatch, onRemove }) {
  const shown = rows.map((row, index) => ({ row, index })).filter(({ row }) => hit(row, query))
  const items = kind === 'items'
  const results = kind === 'results'

  return (
    <div className="entity-table" role="table">
      <div
        className={`entity-row entity-head ${items ? 'items' : results ? 'results' : 'plain'}`}
        role="row"
      >
        <span>Id</span>
        <span>Name</span>
        {items && <span>Type</span>}
        {(items || results) && <span>Persists</span>}
        <span />
      </div>
      {shown.map(({ row, index }) => (
        <div
          key={index}
          className={`entity-row ${items ? 'items' : results ? 'results' : 'plain'}`}
          role="row"
        >
          <input
            aria-label="Id"
            value={row.id ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onPatch(index, { id: event.target.value })}
          />
          <input
            aria-label="Name"
            value={row.name ?? ''}
            autoComplete="off"
            onChange={(event) => onPatch(index, { name: event.target.value })}
          />
          {items && (
            <select aria-label="Type" value={row.type ?? 'key'} onChange={(event) => onPatch(index, { type: event.target.value })}>
              {ITEM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              {row.type && !ITEM_TYPES.includes(row.type) && <option value={row.type}>{row.type}</option>}
            </select>
          )}
          {(items || results) && (
            <label className="persist">
              <input
                type="checkbox"
                checked={row.persist === true}
                onChange={(event) => onPatch(index, persistPatch(event.target.checked))}
              />
              <span className="sr-only">Persists across a new run</span>
            </label>
          )}
          <button type="button" className="text-btn" onClick={() => onRemove(index)}>
            Remove
          </button>
        </div>
      ))}
      {shown.length === 0 && <p className="no-match">No rows match.</p>}
    </div>
  )
}

function persistPatch(checked) {
  return { persist: checked }
}

function appendRow(currentDraft, section) {
  if (section === 'areas') {
    const areas = currentDraft.areas ?? []
    return { ...currentDraft, areas: [...areas, { id: uniqueId(areas, 'area'), name: '' }] }
  }
  if (section === 'enemies') {
    const enemies = currentDraft.enemies ?? []
    return { ...currentDraft, enemies: [...enemies, { id: uniqueId(enemies, 'enemy'), name: '' }] }
  }
  if (section === 'results') {
    const results = currentDraft.results ?? []
    return { ...currentDraft, results: [...results, { id: uniqueId(results, 'result'), name: '' }] }
  }
  if (section === 'items') {
    const items = currentDraft.items ?? []
    return {
      ...currentDraft,
      items: [...items, { id: uniqueId(items, 'item'), name: '', type: 'key' }],
    }
  }
  if (section === 'actions') {
    const actions = currentDraft.actions ?? []
    return {
      ...currentDraft,
      actions: [...actions, blankAction(actions, currentDraft.areas?.[0]?.id ?? '')],
    }
  }
  const achievements = currentDraft.achievements ?? []
  return { ...currentDraft, achievements: [...achievements, blankAchievement(achievements)] }
}

function RefSelect({ value, options, onChange, label }) {
  const ids = new Set(options.map((option) => option.id))
  return (
    <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {value && !ids.has(value) && <option value={value}>{value}</option>}
      {options.map((option, index) => (
        <option key={`${option.id}-${index}`} value={option.id}>
          {label(option)}
        </option>
      ))}
    </select>
  )
}

function ActionForm({ action, areas, items, enemies, results, actions, onChange, onRemove }) {
  const repeatable = action.repeatable === true || action.type === 'farm'

  function changeType(type) {
    const partial = { type }
    if ((type === 'collect' || type === 'farm') && !(action.gives ?? []).length) {
      partial.gives = [{ item: '', amount: 1 }]
    }
    onChange(partial)
  }

  return (
    <div className="detail-form">
      <div className="detail-top">
        <h2 className="detail-title">{action.id || 'New action'}</h2>
        <button type="button" className="text-btn" onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className="detail-grid">
        <label className="field">
          Id
          <input
            value={action.id ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onChange({ id: event.target.value })}
          />
        </label>
        <label className="field">
          Type
          <select value={action.type ?? 'interact'} onChange={(event) => changeType(event.target.value)}>
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Area
          <RefSelect
            value={action.area ?? ''}
            options={areas}
            label={optionLabel}
            onChange={(area) => onChange({ area })}
          />
        </label>
      </div>

      <label className="field edit-block">
        Description
        <textarea
          value={action.description ?? ''}
          rows={3}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>

      <div className="flags">
        <label>
          <input
            type="checkbox"
            checked={repeatable}
            disabled={action.type === 'farm'}
            onChange={(event) => onChange({ repeatable: event.target.checked })}
          />
          Repeatable
        </label>
        <label>
          <input
            type="checkbox"
            checked={action.newRun === true}
            onChange={(event) => onChange({ newRun: event.target.checked })}
          />
          New run
        </label>
      </div>

      {action.type === 'farm' && (
        <div className="edit-block">
          <h3 className="section-label">Source enemy</h3>
          <RefSelect
            value={action.source?.id ?? ''}
            options={enemies}
            label={optionLabel}
            onChange={(id) => onChange({ source: { type: 'enemy', id } })}
          />
        </div>
      )}

      <StackList
        title="Gives"
        rows={action.gives ?? []}
        items={items}
        onChange={(gives) => onChange({ gives })}
      />
      <StackList
        title="Consumes"
        rows={action.consumes ?? []}
        items={items}
        onChange={(consumes) => onChange({ consumes })}
      />
      <RequirementList
        rows={action.requires ?? []}
        items={items}
        actions={actions}
        results={results}
        onChange={(requires) => onChange({ requires })}
      />
      <IdList
        title="Do before"
        hint="This action has to happen before the listed ones."
        rows={action.before ?? []}
        options={actions}
        label={(row) => row.id || '(no id)'}
        onChange={(before) => onChange({ before })}
      />
      <IdList
        title="Sets"
        rows={(action.sets ?? []).map((effect) => effect.id)}
        options={results}
        label={optionLabel}
        onChange={(ids) => onChange({ sets: ids.map((id) => ({ type: 'result', id })) })}
      />
      <IdList
        title="Clears"
        rows={(action.clears ?? []).map((effect) => effect.id)}
        options={results}
        label={optionLabel}
        onChange={(ids) => onChange({ clears: ids.map((id) => ({ type: 'result', id })) })}
      />
    </div>
  )
}

function AchievementForm({ achievement, actions, achievements, onChange, onRemove }) {
  return (
    <div className="detail-form">
      <div className="detail-top">
        <h2 className="detail-title">{achievement.name || achievement.id || 'New achievement'}</h2>
        <button type="button" className="text-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="detail-grid">
        <label className="field">
          Id
          <input
            value={achievement.id ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onChange({ id: event.target.value })}
          />
        </label>
        <label className="field grow">
          Name
          <input
            value={achievement.name ?? ''}
            autoComplete="off"
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
      </div>
      <label className="field edit-block">
        Description
        <textarea
          value={achievement.description ?? ''}
          rows={3}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      <div className="edit-block">
        <h3 className="section-label">Conditions</h3>
        <Conditions
          conditions={achievement.conditions ?? []}
          actions={actions}
          achievements={achievements}
          onChange={(conditions) => onChange({ conditions })}
        />
      </div>
    </div>
  )
}

function StackList({ title, rows, items, onChange }) {
  return (
    <div className="edit-block">
      <h3 className="section-label">{title}</h3>
      <div className="edit-list">
        {rows.map((stack, index) => (
          <div className="edit-list-row" key={index}>
            <RefSelect
              value={stack.item ?? ''}
              options={items}
              label={optionLabel}
              onChange={(item) => {
                const next = rows.slice()
                next[index] = { ...stack, item }
                onChange(next)
              }}
            />
            <input
              type="number"
              min="1"
              step="1"
              aria-label="Amount"
              value={stack.amount ?? 1}
              onChange={(event) => {
                const next = rows.slice()
                next[index] = { ...stack, amount: Number(event.target.value) }
                onChange(next)
              }}
            />
            <button
              type="button"
              className="text-btn"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="text-btn" onClick={() => onChange([...rows, { item: '', amount: 1 }])}>
          Add
        </button>
      </div>
    </div>
  )
}

function RequirementList({ rows, items, actions, results, onChange }) {
  function setRow(index, row) {
    const next = rows.slice()
    next[index] = row
    onChange(next)
  }

  return (
    <div className="edit-block">
      <h3 className="section-label">Requires</h3>
      <div className="edit-list">
        {rows.map((requirement, index) => (
          <div className="edit-list-row" key={index}>
            <select
              aria-label="Requirement type"
              value={requirement.type ?? 'action'}
              onChange={(event) => {
                const type = event.target.value
                setRow(index, type === 'inventory' ? { type, item: '', amount: 1 } : { type, id: '' })
              }}
            >
              <option value="action">action</option>
              <option value="inventory">inventory</option>
              <option value="result">result</option>
            </select>
            {requirement.type === 'inventory' ? (
              <>
                <RefSelect
                  value={requirement.item ?? ''}
                  options={items}
                  label={optionLabel}
                  onChange={(item) => setRow(index, { ...requirement, item })}
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  aria-label="Amount"
                  value={requirement.amount ?? 1}
                  onChange={(event) => setRow(index, { ...requirement, amount: Number(event.target.value) })}
                />
              </>
            ) : (
              <RefSelect
                value={requirement.id ?? ''}
                options={requirement.type === 'result' ? results : actions}
                label={requirement.type === 'result' ? optionLabel : (row) => row.id || '(no id)'}
                onChange={(id) => setRow(index, { ...requirement, id })}
              />
            )}
            <button type="button" className="text-btn" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="text-btn" onClick={() => onChange([...rows, { type: 'action', id: '' }])}>
          Add
        </button>
      </div>
    </div>
  )
}

function IdList({ title, hint, rows, options, label, onChange }) {
  return (
    <div className="edit-block">
      <h3 className="section-label" title={hint}>
        {title}
      </h3>
      <div className="edit-list">
        {rows.map((id, index) => (
          <div className="edit-list-row" key={index}>
            <RefSelect
              value={id}
              options={options}
              label={label}
              onChange={(nextId) => {
                const next = rows.slice()
                next[index] = nextId
                onChange(next)
              }}
            />
            <button type="button" className="text-btn" onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="text-btn" onClick={() => onChange([...rows, ''])}>
          Add
        </button>
      </div>
    </div>
  )
}

function Conditions({ conditions, actions, achievements, onChange }) {
  function patch(index, next) {
    const copy = conditions.slice()
    copy[index] = next
    onChange(copy)
  }

  function add(type) {
    const row =
      type === 'any' ? { type: 'any', of: [{ type: 'action', id: '' }] } : { type, id: '' }
    onChange([...conditions, row])
  }

  return (
    <div className="conditions">
      {conditions.map((condition, index) => (
        <div className="condition" key={index}>
          <div className="condition-row">
            <select
              aria-label="Condition type"
              value={condition.type ?? 'action'}
              onChange={(event) => {
                const type = event.target.value
                patch(
                  index,
                  type === 'any' ? { type: 'any', of: [{ type: 'action', id: '' }] } : { type, id: '' },
                )
              }}
            >
              <option value="action">action</option>
              <option value="achievement">achievement</option>
              <option value="any">any of</option>
            </select>
            {condition.type === 'action' && (
              <RefSelect
                value={condition.id ?? ''}
                options={actions}
                label={(row) => row.id || '(no id)'}
                onChange={(id) => patch(index, { ...condition, id })}
              />
            )}
            {condition.type === 'achievement' && (
              <RefSelect
                value={condition.id ?? ''}
                options={achievements}
                label={optionLabel}
                onChange={(id) => patch(index, { ...condition, id })}
              />
            )}
            <button
              type="button"
              className="text-btn"
              onClick={() => onChange(conditions.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          {condition.type === 'any' && (
            <Conditions
              conditions={condition.of ?? []}
              actions={actions}
              achievements={achievements}
              onChange={(of) => patch(index, { ...condition, of })}
            />
          )}
        </div>
      ))}
      <div className="condition-row">
        <button type="button" className="text-btn" onClick={() => add('action')}>
          Add action
        </button>
        <button type="button" className="text-btn" onClick={() => add('achievement')}>
          Add achievement
        </button>
        <button type="button" className="text-btn" onClick={() => add('any')}>
          Add any
        </button>
      </div>
    </div>
  )
}
