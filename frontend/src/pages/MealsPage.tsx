import { useState, useMemo, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HealthImpactCard } from '../components/health/HealthImpactCard'
import {
  listMealPlans, createMealPlan, updateMealPlan, deleteMealPlan,
  getMealTotals, saveMealLog, updateMealLog,
  listMealTemplates, createMealTemplate, copyMealDay, getMealWeekSummary,
  listFoodItems, createFoodItem, deleteFoodItem,
  createMealIngredient, updateMealIngredient, deleteMealIngredient,
  getHealthOverview,
} from '../lib/api'
import type { MealPlan, MealTotals, MealTemplate, FoodItem, MealIngredient, HealthGoalProfile } from '../lib/types'
import { CollapsibleSection } from '../components/CollapsibleSection'

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toLocaleDateString('en-CA')
}

function shiftDate(d: string, delta: number): string {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + delta)
  return dt.toLocaleDateString('en-CA')
}

function formatDateLabel(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function getWeekStart(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  const day = dt.getDay()
  const offset = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + offset)
  return dt.toLocaleDateString('en-CA')
}

// ── Macro helpers ─────────────────────────────────────────────────────────────

function computeIngMacros(ing: { quantity_g: string; calories_per_100g: string | null; protein_per_100g: string | null; fat_per_100g: string | null; carbs_per_100g: string | null }) {
  const q = parseFloat(ing.quantity_g) / 100
  return {
    calories:  Math.round((parseFloat(ing.calories_per_100g  ?? '0') || 0) * q),
    protein_g: Math.round((parseFloat(ing.protein_per_100g   ?? '0') || 0) * q * 10) / 10,
    fat_g:     Math.round((parseFloat(ing.fat_per_100g       ?? '0') || 0) * q * 10) / 10,
    carbs_g:   Math.round((parseFloat(ing.carbs_per_100g     ?? '0') || 0) * q * 10) / 10,
  }
}

// ── Nutrition targets (localStorage) ─────────────────────────────────────────

type NutritionTargets = { calories: number; protein_g: number; fat_g: number; carbs_g: number; fiber_g: number }

function deriveTargets(goals: HealthGoalProfile): NutritionTargets {
  const byBodyGoal: Record<HealthGoalProfile['body_goal'], Omit<NutritionTargets, 'protein_g'>> = {
    lose_fat: { calories: 1900, fat_g: 60, carbs_g: 180, fiber_g: 32 },
    maintain: { calories: 2200, fat_g: 70, carbs_g: 230, fiber_g: 30 },
    gain_muscle: { calories: 2600, fat_g: 75, carbs_g: 290, fiber_g: 30 },
  }
  return {
    protein_g: goals.protein_g_target,
    ...byBodyGoal[goals.body_goal],
  }
}

const DEFAULT_TARGETS: NutritionTargets = { calories: 2200, protein_g: 150, fat_g: 70, carbs_g: 230, fiber_g: 30 }
const TARGETS_KEY = 'nutrition_targets_v1'

function getTargets(): NutritionTargets {
  try {
    const raw = localStorage.getItem(TARGETS_KEY)
    if (raw) return { ...DEFAULT_TARGETS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_TARGETS }
}

function saveTargets(targets: NutritionTargets) {
  try { localStorage.setItem(TARGETS_KEY, JSON.stringify(targets)) } catch { /* ignore */ }
}

// ── Macro bar ─────────────────────────────────────────────────────────────────

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const isOver = value > target
  const color = isOver ? '#dc2626' : pct > 90 ? '#f59e0b' : 'var(--accent)'
  return (
    <div className="macro-bar-row">
      <span className="macro-bar-label">{label}</span>
      <div className="macro-bar-track">
        <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="macro-bar-value" style={{ color: isOver ? '#dc2626' : 'var(--text)' }}>
        {Math.round(value)}{unit} / {target}{unit}
      </span>
    </div>
  )
}

// ── Nutrition totals bar ──────────────────────────────────────────────────────

function NutritionTotalsBar({ totals }: { totals: MealTotals }) {
  const [editingTargets, setEditingTargets] = useState(false)
  const [localTargets, setLocalTargets] = useState(getTargets)

  function saveAndClose() {
    saveTargets(localTargets)
    setEditingTargets(false)
  }

  const remainingItems = useMemo(() => {
    if (editingTargets) return []
    return [
      { label: 'Protein', value: Math.round(localTargets.protein_g - totals.protein_g), unit: 'g' },
      { label: 'Carbs',   value: Math.round(localTargets.carbs_g   - totals.carbs_g),   unit: 'g' },
      { label: 'Fat',     value: Math.round(localTargets.fat_g     - totals.fat_g),     unit: 'g' },
      { label: 'kcal',    value: Math.round(localTargets.calories  - totals.calories),  unit: '' },
    ].filter(r => r.value > 0)
  }, [localTargets, totals, editingTargets])

  return (
    <div className="nutrition-totals-bar sticky">
      <div className="nutrition-totals-header">
        <span className="nutrition-totals-kcal">{totals.calories} kcal</span>
        <button className="btn-ghost-sm" onClick={() => setEditingTargets(p => !p)}>
          ⚙ Targets
        </button>
      </div>

      {editingTargets && (
        <div className="nutrition-targets-form">
          {(Object.keys(localTargets) as Array<keyof typeof DEFAULT_TARGETS>).map(k => (
            <div key={k} className="nutrition-target-row">
              <label className="sp-label">{k.replace('_', ' ')}</label>
              <input
                className="form-input"
                type="number"
                style={{ width: 80 }}
                value={localTargets[k]}
                onChange={e => setLocalTargets((t: typeof DEFAULT_TARGETS) => ({ ...t, [k]: parseInt(e.target.value) || 0 }))}
              />
            </div>
          ))}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button className="btn-ghost" onClick={() => setEditingTargets(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveAndClose}>Save</button>
          </div>
        </div>
      )}

      {!editingTargets && (
        <>
          <div className="macro-bars">
            <MacroBar label="Protein" value={totals.protein_g} target={localTargets.protein_g} unit="g" />
            <MacroBar label="Carbs"   value={totals.carbs_g}   target={localTargets.carbs_g}   unit="g" />
            <MacroBar label="Fat"     value={totals.fat_g}     target={localTargets.fat_g}     unit="g" />
            <MacroBar label="Fiber"   value={totals.fiber_g}   target={localTargets.fiber_g}   unit="g" />
          </div>
          {remainingItems.length > 0 && (
            <div className="macro-remaining-row">
              {remainingItems.map(r => (
                <span key={r.label} className="macro-remaining-chip">
                  {r.label} <strong>{r.value}{r.unit}</strong> left
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Ingredient row (with live what-if) ────────────────────────────────────────

function IngredientRow({
  ingredient, date,
  onQtyChange,
}: {
  ingredient: MealIngredient
  date: string
  onQtyChange: (id: string, qty: string) => void
}) {
  const qc = useQueryClient()

  // Is this a piece-based ingredient?
  const isPiece = ingredient.quantity_pieces !== null && ingredient.grams_per_piece !== null

  // Editable value — pieces or grams depending on mode
  const [pieces, setPieces] = useState(ingredient.quantity_pieces ?? '1')
  const [qty, setQty]       = useState(ingredient.quantity_g)

  // Effective quantity in grams (used for macro preview)
  const effectiveQtyG = useMemo(() => {
    if (isPiece) {
      const p   = parseFloat(String(pieces)) || 0
      const gpb = parseFloat(String(ingredient.grams_per_piece ?? '0')) || 0
      return String(Math.round(p * gpb * 10) / 10)
    }
    return qty
  }, [isPiece, pieces, qty, ingredient.grams_per_piece])

  const dirty = isPiece
    ? String(pieces) !== String(ingredient.quantity_pieces)
    : qty !== ingredient.quantity_g

  const preview = useMemo(() => computeIngMacros({
    quantity_g: effectiveQtyG,
    calories_per_100g: ingredient.calories_per_100g,
    protein_per_100g: ingredient.protein_per_100g,
    fat_per_100g: ingredient.fat_per_100g,
    carbs_per_100g: ingredient.carbs_per_100g,
  }), [effectiveQtyG, ingredient])

  // Notify parent for live meal total
  useEffect(() => { onQtyChange(ingredient.id, effectiveQtyG) }, [effectiveQtyG])

  const updateMut = useMutation({
    mutationFn: () => isPiece
      ? updateMealIngredient(ingredient.id, { quantity_pieces: String(pieces), quantity_g: effectiveQtyG })
      : updateMealIngredient(ingredient.id, { quantity_g: qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteMealIngredient(ingredient.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
    },
  })

  return (
    <div className="ingredient-row">
      <span className="ingredient-name">{ingredient.name}</span>
      <div className="ingredient-qty-wrap">
        {isPiece ? (
          <>
            <input
              className="ingredient-qty-input"
              type="number"
              min="0.5"
              step="0.5"
              value={pieces}
              onChange={e => setPieces(e.target.value)}
              onBlur={() => { if (dirty) updateMut.mutate() }}
            />
            <span className="caption">
              {ingredient.serving_label || 'pc'}
            </span>
          </>
        ) : (
          <>
            <input
              className="ingredient-qty-input"
              type="number"
              min="1"
              max="9999"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onBlur={() => { if (dirty) updateMut.mutate() }}
            />
            <span className="caption">g</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span className={`ingredient-macros${dirty ? ' ingredient-macro-changed' : ''}`}>
          {preview.protein_g}P · {preview.carbs_g}C · {preview.fat_g}F · {preview.calories}cal
        </span>
        {isPiece && (
          <span className="caption font-mono">
            = {effectiveQtyG}g
          </span>
        )}
      </div>
      <button
        className="btn-icon-sm"
        style={{ color: '#dc2626', padding: 0 }}
        disabled={deleteMut.isPending}
        onClick={() => deleteMut.mutate()}
        title="Remove ingredient"
      >
        ✕
      </button>
    </div>
  )
}

// ── Add ingredient form ───────────────────────────────────────────────────────

const FOOD_CATEGORIES = ['all', 'protein', 'grain', 'vegetable', 'fruit', 'dairy', 'legume', 'nut', 'fat', 'beverage', 'other'] as const
const CAT_LABEL: Record<string, string> = {
  all: 'All', protein: 'Protein', grain: 'Grain', vegetable: 'Vegetable',
  fruit: 'Fruit', dairy: 'Dairy', legume: 'Legume', nut: 'Nut & Seed',
  fat: 'Fat & Oil', beverage: 'Beverage', other: 'Other',
}

function AddIngredientForm({
  mealPlanId, date, foodItems, onDone,
}: {
  mealPlanId: string; date: string; foodItems: FoodItem[]; onDone: () => void
}) {
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState('all')
  const [dropOpen, setDropOpen]     = useState(false)
  const [selected, setSelected]     = useState<FoodItem | null>(null)
  const [qty, setQty]               = useState('100')
  const [usesPieces, setUsesPieces] = useState(false)
  const [pieces, setPieces]         = useState('1')
  const [customName, setCustomName] = useState('')
  const [isNewFood, setIsNewFood]   = useState(false)
  const [per100, setPer100]         = useState({ calories: '', protein: '', fat: '', carbs: '', fiber: '' })
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let list = foodItems
    if (catFilter !== 'all') list = list.filter(f => f.category === catFilter)
    if (search.trim().length >= 1) list = list.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [search, catFilter, foodItems])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const effectiveQtyG = useMemo(() => {
    if (usesPieces && selected?.grams_per_piece) {
      const p = parseFloat(pieces) || 0
      const g = parseFloat(selected.grams_per_piece) || 0
      return String(Math.round(p * g * 10) / 10)
    }
    return qty
  }, [usesPieces, pieces, qty, selected])

  const preview = useMemo(() => {
    if (!selected && !isNewFood) return null
    const src = selected
      ? { calories_per_100g: selected.calories_per_100g, protein_per_100g: selected.protein_per_100g, fat_per_100g: selected.fat_per_100g, carbs_per_100g: selected.carbs_per_100g }
      : { calories_per_100g: per100.calories, protein_per_100g: per100.protein, fat_per_100g: per100.fat, carbs_per_100g: per100.carbs }
    return computeIngMacros({ quantity_g: effectiveQtyG, ...src })
  }, [selected, isNewFood, effectiveQtyG, per100])

  const addMut = useMutation({
    mutationFn: async () => {
      let foodItemId: string | undefined = selected?.id

      // If new food — create FoodItem first
      if (isNewFood) {
        const fi = await createFoodItem({
          name: customName.trim(),
          calories_per_100g: per100.calories || undefined,
          protein_per_100g: per100.protein || undefined,
          fat_per_100g: per100.fat || undefined,
          carbs_per_100g: per100.carbs || undefined,
          fiber_per_100g: per100.fiber || undefined,
        })
        foodItemId = fi.id
        qc.invalidateQueries({ queryKey: ['food-items'] })
      }

      return createMealIngredient({
        meal_plan: mealPlanId,
        food_item: foodItemId ?? null,
        name: isNewFood ? customName.trim() : (selected?.name ?? customName.trim()),
        quantity_g: effectiveQtyG,
        quantity_pieces: (usesPieces && !isNewFood) ? String(pieces) : undefined,
        calories_per_100g: isNewFood ? (per100.calories || undefined) : (selected?.calories_per_100g ?? undefined),
        protein_per_100g:  isNewFood ? (per100.protein  || undefined) : (selected?.protein_per_100g  ?? undefined),
        fat_per_100g:      isNewFood ? (per100.fat      || undefined) : (selected?.fat_per_100g      ?? undefined),
        carbs_per_100g:    isNewFood ? (per100.carbs    || undefined) : (selected?.carbs_per_100g    ?? undefined),
        fiber_per_100g:    isNewFood ? (per100.fiber    || undefined) : (selected?.fiber_per_100g    ?? undefined),
        vitamins_per_100g: selected?.vitamins_per_100g ?? {},
        minerals_per_100g: selected?.minerals_per_100g ?? {},
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
      onDone()
    },
  })

  const canAdd = (selected || (isNewFood && customName.trim())) && (
    usesPieces ? parseFloat(pieces) > 0 : (qty && parseFloat(qty) > 0)
  )

  const hasExtended = selected && (
    selected.saturated_fat_per_100g || selected.sugar_per_100g || selected.sodium_mg_per_100g ||
    Object.keys(selected.vitamins_per_100g ?? {}).length > 0 || Object.keys(selected.minerals_per_100g ?? {}).length > 0
  )

  return (
    <div className="add-ingredient-form">
      {/* Category filter tabs — only shown before selection */}
      {!selected && !isNewFood && (
        <div className="food-category-tabs">
          {FOOD_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`food-category-tab${catFilter === cat ? ' active' : ''}`}
              onClick={() => setCatFilter(cat)}
            >
              {CAT_LABEL[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Food search / select */}
      {!selected && !isNewFood && (
        <div className="ingredient-search-wrap" ref={wrapRef}>
          <input
            className="form-input"
            placeholder="Search food library…"
            value={search}
            autoFocus
            onChange={e => { setSearch(e.target.value); setDropOpen(true) }}
            onFocus={() => setDropOpen(true)}
          />
          {dropOpen && (
            <div className="ingredient-dropdown">
              {filtered.map(f => (
                <div
                  key={f.id}
                  className="ingredient-option"
                  onMouseDown={() => {
                    setSelected(f)
                    setDropOpen(false)
                    setSearch('')
                    if (f.serving_unit === 'piece') {
                      setUsesPieces(true)
                      setPieces('1')
                    } else {
                      setUsesPieces(false)
                      setQty('100')
                    }
                  }}
                >
                  <span>{f.name}</span>
                  <span className="ingredient-option-macros">
                    {f.calories_per_100g ? `${f.calories_per_100g}cal` : ''}
                    {f.protein_per_100g ? ` · ${f.protein_per_100g}P` : ''}
                    {f.carbs_per_100g ? ` · ${f.carbs_per_100g}C` : ''}
                    {f.fat_per_100g ? ` · ${f.fat_per_100g}F` : ''}
                    {' '}/ 100g
                  </span>
                </div>
              ))}
              <div
                className="ingredient-option"
                style={{ color: 'var(--accent)', fontWeight: 600 }}
                onMouseDown={() => {
                  setIsNewFood(true)
                  setCustomName(search)
                  setDropOpen(false)
                }}
              >
                + Add new food: {search ? `"${search}"` : '…'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected food: header + expanded nutrition panel */}
      {selected && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className={`food-category-badge food-cat-${selected.category}`}>{CAT_LABEL[selected.category] ?? selected.category}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{selected.name}</span>
            {selected.is_verified && <span className="caption" style={{ color: 'var(--accent)' }}>✓ Verified</span>}
            <button className="btn-ghost-sm" style={{ marginLeft: 'auto' }} onClick={() => { setSelected(null); setUsesPieces(false); setPieces('1'); setQty('100') }}>✕ Change</button>
          </div>
          {/* Core + extended macros per 100g */}
          <div className="food-nutrition-panel">
            {selected.calories_per_100g      && <span className="food-nutrition-chip">{selected.calories_per_100g} kcal</span>}
            {selected.protein_per_100g       && <span className="food-nutrition-chip">{selected.protein_per_100g}g Protein</span>}
            {selected.carbs_per_100g         && <span className="food-nutrition-chip">{selected.carbs_per_100g}g Carbs</span>}
            {selected.fat_per_100g           && <span className="food-nutrition-chip">{selected.fat_per_100g}g Fat</span>}
            {selected.fiber_per_100g         && <span className="food-nutrition-chip">{selected.fiber_per_100g}g Fiber</span>}
            {selected.saturated_fat_per_100g && <span className="food-nutrition-chip">{selected.saturated_fat_per_100g}g Sat fat</span>}
            {selected.sugar_per_100g         && <span className="food-nutrition-chip">{selected.sugar_per_100g}g Sugar</span>}
            {selected.sodium_mg_per_100g     && <span className="food-nutrition-chip">{selected.sodium_mg_per_100g}mg Na</span>}
            {selected.cholesterol_mg_per_100g && <span className="food-nutrition-chip">{selected.cholesterol_mg_per_100g}mg Chol</span>}
          </div>
          {/* Vitamins / minerals %DV chips */}
          {hasExtended && (Object.keys(selected.vitamins_per_100g ?? {}).length > 0 || Object.keys(selected.minerals_per_100g ?? {}).length > 0) && (
            <div className="food-nutrition-panel" style={{ marginTop: 2 }}>
              {Object.entries(selected.vitamins_per_100g ?? {}).map(([k, v]) => (
                <span key={`vit-${k}`} className="food-nutrition-chip" style={{ color: 'var(--accent)' }}>Vit {k} {v}%</span>
              ))}
              {Object.entries(selected.minerals_per_100g ?? {}).map(([k, v]) => (
                <span key={`min-${k}`} className="food-nutrition-chip">{k} {v}%</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New food per-100g inputs */}
      {isNewFood && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Food name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
            <button className="btn-ghost-sm" onClick={() => { setIsNewFood(false); setCustomName('') }}>✕</button>
          </div>
          <p className="sp-label" style={{ marginBottom: 4 }}>Per 100g</p>
          <div className="meal-macros-grid" style={{ marginBottom: 8 }}>
            {[
              { k: 'calories' as const, label: 'kcal' },
              { k: 'protein'  as const, label: 'Protein g' },
              { k: 'carbs'    as const, label: 'Carbs g' },
              { k: 'fat'      as const, label: 'Fat g' },
              { k: 'fiber'    as const, label: 'Fiber g' },
            ].map(({ k, label }) => (
              <div key={k} className="sp-field">
                <label className="sp-label">{label}</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={per100[k]}
                  onChange={e => setPer100(p => ({ ...p, [k]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quantity + preview */}
      {(selected || isNewFood) && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {usesPieces ? (
              <div className="sp-field" style={{ margin: 0 }}>
                <label className="sp-label">{selected?.serving_label ? `${selected.serving_label}s` : 'pieces'}</label>
                <input
                  className="form-input"
                  type="number"
                  min="0.5"
                  step="0.5"
                  style={{ width: 80 }}
                  value={pieces}
                  onChange={e => setPieces(e.target.value)}
                />
              </div>
            ) : (
              <div className="sp-field" style={{ margin: 0 }}>
                <label className="sp-label">Amount (g)</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  style={{ width: 80 }}
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                />
              </div>
            )}
            {selected?.serving_unit === 'piece' && (
              <button
                className="btn-ghost-sm"
                style={{ marginTop: 16 }}
                onClick={() => setUsesPieces(p => !p)}
              >
                {usesPieces ? 'Use grams' : 'Use pieces'}
              </button>
            )}
            {preview && (
              <span className="ingredient-macros" style={{ marginTop: 16 }}>
                → {preview.calories} kcal · {preview.protein_g}g P · {preview.carbs_g}g C · {preview.fat_g}g F
              </span>
            )}
          </div>
          {usesPieces && effectiveQtyG && (
            <span className="caption font-mono">
              = {effectiveQtyG}g
            </span>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onDone}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!canAdd || addMut.isPending}
          onClick={() => addMut.mutate()}
        >
          {addMut.isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── Add / edit meal form ──────────────────────────────────────────────────────

const VITAMINS = ['A', 'C', 'D', 'B12', 'B6', 'Folate', 'E', 'K']
const MINERALS = ['Iron', 'Calcium', 'Magnesium', 'Zinc', 'Potassium', 'Sodium', 'Phosphorus']

function MealForm({
  slot, date, existing, onDone,
}: {
  slot: string; date: string; existing?: MealPlan; onDone: () => void
}) {
  const qc = useQueryClient()
  const [name, setName]         = useState(existing?.name ?? '')
  const [calories, setCalories] = useState(String(existing?.calories ?? ''))
  const [protein, setProtein]   = useState(String(existing?.protein_g ?? ''))
  const [fat, setFat]           = useState(String(existing?.fat_g ?? ''))
  const [carbs, setCarbs]       = useState(String(existing?.carbs_g ?? ''))
  const [fiber, setFiber]       = useState(String(existing?.fiber_g ?? ''))
  const [vitamins, setVitamins] = useState<Record<string, number>>(existing?.vitamins ?? {})
  const [minerals, setMinerals] = useState<Record<string, number>>(existing?.minerals ?? {})
  const [notes, setNotes]       = useState(existing?.notes ?? '')
  const [manualCalories, setManualCalories] = useState(!!existing?.calories)

  useEffect(() => {
    if (manualCalories) return
    const p = parseFloat(protein) || 0
    const c = parseFloat(carbs)   || 0
    const f = parseFloat(fat)     || 0
    if (p || c || f) setCalories(String(Math.round(p * 4 + c * 4 + f * 9)))
  }, [protein, carbs, fat, manualCalories])

  const mut = useMutation({
    mutationFn: (payload: Partial<MealPlan>) =>
      existing
        ? updateMealPlan(existing.id, payload)
        : createMealPlan({ ...payload, date, slot: slot as 'breakfast' | 'lunch' | 'dinner' | 'snack' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
      onDone()
    },
  })

  function handleSave() {
    if (!name.trim()) return
    mut.mutate({
      name: name.trim(),
      calories: calories ? parseInt(calories) : undefined,
      protein_g: protein || undefined,
      fat_g: fat || undefined,
      carbs_g: carbs || undefined,
      fiber_g: fiber || undefined,
      vitamins,
      minerals,
      notes,
    })
  }

  function setMicro(map: Record<string, number>, setMap: (m: Record<string, number>) => void, key: string, val: string) {
    setMap({ ...map, [key]: parseInt(val) || 0 })
  }

  return (
    <div className="meal-form">
      <div className="sp-field">
        <label className="sp-label">Meal name *</label>
        <input className="form-input" placeholder="e.g. Grilled chicken with rice" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="meal-macros-grid">
        <div className="sp-field">
          <label className="sp-label">
            Calories (kcal)
            {!manualCalories && calories && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>(auto)</span>}
          </label>
          <input
            className="form-input"
            type="number"
            placeholder="0"
            value={calories}
            onChange={e => { setManualCalories(true); setCalories(e.target.value) }}
          />
        </div>
        <div className="sp-field">
          <label className="sp-label">Protein (g)</label>
          <input className="form-input" type="number" placeholder="0" value={protein} onChange={e => setProtein(e.target.value)} />
        </div>
        <div className="sp-field">
          <label className="sp-label">Carbs (g)</label>
          <input className="form-input" type="number" placeholder="0" value={carbs} onChange={e => setCarbs(e.target.value)} />
        </div>
        <div className="sp-field">
          <label className="sp-label">Fat (g)</label>
          <input className="form-input" type="number" placeholder="0" value={fat} onChange={e => setFat(e.target.value)} />
        </div>
        <div className="sp-field">
          <label className="sp-label">Fiber (g)</label>
          <input className="form-input" type="number" placeholder="0" value={fiber} onChange={e => setFiber(e.target.value)} />
        </div>
      </div>

      <CollapsibleSection title="Vitamins & Minerals (% Daily Value)" storageKey={`meal-micros-${slot}`} defaultOpen={false}>
        <div className="micro-grid">
          <p className="sp-label" style={{ gridColumn: '1/-1', marginBottom: 4, fontWeight: 700 }}>Vitamins (%DV)</p>
          {VITAMINS.map(v => (
            <div key={v} className="sp-field" style={{ minWidth: 90 }}>
              <label className="sp-label">{v}</label>
              <input className="form-input" type="number" min="0" max="999" placeholder="0" value={vitamins[v] ?? ''} onChange={e => setMicro(vitamins, setVitamins, v, e.target.value)} />
            </div>
          ))}
          <p className="sp-label" style={{ gridColumn: '1/-1', marginBottom: 4, marginTop: 8, fontWeight: 700 }}>Minerals (%DV)</p>
          {MINERALS.map(m => (
            <div key={m} className="sp-field" style={{ minWidth: 90 }}>
              <label className="sp-label">{m}</label>
              <input className="form-input" type="number" min="0" max="999" placeholder="0" value={minerals[m] ?? ''} onChange={e => setMicro(minerals, setMinerals, m, e.target.value)} />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <div className="sp-field">
        <label className="sp-label">Notes</label>
        <textarea className="form-input" rows={2} placeholder="Optional…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="modal-actions">
        <button className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={mut.isPending || !name.trim()} onClick={handleSave}>
          {mut.isPending ? 'Saving…' : existing ? 'Update' : 'Add meal'}
        </button>
      </div>
    </div>
  )
}

// ── Log adherence ─────────────────────────────────────────────────────────────

const EAT_STATUS_OPTS = [
  { value: 'as_planned',      label: '✓ As planned',  cls: 'eat-planned'  },
  { value: 'ate_less',        label: '↓ Ate less',     cls: 'eat-less'     },
  { value: 'ate_more',        label: '↑ Ate more',     cls: 'eat-more'     },
  { value: 'ate_differently', label: '~ Different',    cls: 'eat-diff'     },
  { value: 'skipped',         label: '✗ Skipped',      cls: 'eat-skipped'  },
]

// ── Meal plan card ────────────────────────────────────────────────────────────

function MealPlanCard({
  plan, date, foodItems, onEdit, onDelete,
}: {
  plan: MealPlan; date: string; foodItems: FoodItem[]
  onEdit: () => void; onDelete: () => void
}) {
  const qc = useQueryClient()
  const [logNote, setLogNote]         = useState(plan.log?.notes ?? '')
  const [savedFlash, setSavedFlash]   = useState(false)
  const [addingIng, setAddingIng]     = useState(false)
  // Live what-if quantity overrides: { [ingredientId]: qty string }
  const [liveQtys, setLiveQtys]       = useState<Record<string, string>>({})

  // Compute live meal total (updates in real-time as user edits ingredient quantities)
  const liveTotal = useMemo(() => {
    return plan.ingredients.reduce((acc, ing) => {
      const qty = liveQtys[ing.id] ?? ing.quantity_g
      const m = computeIngMacros({
        quantity_g: qty,
        calories_per_100g: ing.calories_per_100g,
        protein_per_100g: ing.protein_per_100g,
        fat_per_100g: ing.fat_per_100g,
        carbs_per_100g: ing.carbs_per_100g,
      })
      return {
        calories:  acc.calories  + m.calories,
        protein_g: acc.protein_g + m.protein_g,
        fat_g:     acc.fat_g     + m.fat_g,
        carbs_g:   acc.carbs_g   + m.carbs_g,
      }
    }, { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 })
  }, [plan.ingredients, liveQtys])

  const logMut = useMutation({
    mutationFn: (status: string) => {
      if (plan.log?.id) return updateMealLog(plan.log.id, { status: status as never })
      return saveMealLog({ plan: plan.id, date, slot: plan.slot, status })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans', date] }),
  })

  const templateMut = useMutation({
    mutationFn: () => createMealTemplate({
      slot: plan.slot, name: plan.name,
      calories: plan.calories ?? undefined,
      protein_g: plan.protein_g ?? undefined,
      fat_g: plan.fat_g ?? undefined,
      carbs_g: plan.carbs_g ?? undefined,
      fiber_g: plan.fiber_g ?? undefined,
      vitamins: plan.vitamins, minerals: plan.minerals, notes: plan.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-templates'] })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    },
  })

  const macros = [
    plan.calories && `${plan.calories} kcal`,
    plan.protein_g && `${plan.protein_g}g P`,
    plan.carbs_g && `${plan.carbs_g}g C`,
    plan.fat_g && `${plan.fat_g}g F`,
  ].filter(Boolean)

  const currentStatus = plan.log?.status ?? null
  const showNoteInput = currentStatus && currentStatus !== 'as_planned' && currentStatus !== 'skipped'
  const hasIngredients = plan.ingredients.length > 0
  const liveChanged = Object.keys(liveQtys).length > 0

  return (
    <div className="meal-plan-card">
      <div className="meal-plan-card-header">
        <span className="meal-plan-name">{plan.name}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {savedFlash
            ? <span className="caption" style={{ color: 'var(--accent)' }}>✓ Saved</span>
            : <button className="btn-ghost-sm" onClick={() => templateMut.mutate()} disabled={templateMut.isPending} title="Save as template">📌</button>
          }
          <button className="btn-ghost-sm" onClick={onEdit}>Edit</button>
          <button className="btn-ghost-sm" onClick={onDelete} style={{ color: '#dc2626' }}>✕</button>
        </div>
      </div>

      {/* Show ingredient-computed total if ingredients exist, else manual macros */}
      {!hasIngredients && macros.length > 0 && (
        <div className="meal-macro-chips">
          {macros.map((m, i) => <span key={i} className="meal-macro-chip">{m}</span>)}
        </div>
      )}
      {plan.notes && <p className="meal-plan-notes">{plan.notes}</p>}

      {/* ── Ingredients list ── */}
      {hasIngredients && (
        <div className="ingredient-list">
          {plan.ingredients.map(ing => (
            <IngredientRow
              key={ing.id}
              ingredient={ing}
              date={date}
              onQtyChange={(id, qty) => setLiveQtys(prev => ({ ...prev, [id]: qty }))}
            />
          ))}
          {/* Live what-if total */}
          <div className={`ingredient-total-row${liveChanged ? ' ingredient-macro-changed' : ''}`}>
            {liveChanged && <span style={{ marginRight: 4 }}>⚡</span>}
            {liveTotal.calories} kcal · {Math.round(liveTotal.protein_g * 10) / 10}g P · {Math.round(liveTotal.carbs_g * 10) / 10}g C · {Math.round(liveTotal.fat_g * 10) / 10}g F
          </div>
        </div>
      )}

      {/* Add ingredient button / form */}
      {addingIng ? (
        <AddIngredientForm
          mealPlanId={plan.id}
          date={date}
          foodItems={foodItems}
          onDone={() => setAddingIng(false)}
        />
      ) : (
        <button className="meal-add-ingredient-btn" onClick={() => setAddingIng(true)}>
          + Add ingredient
        </button>
      )}

      {/* Adherence log */}
      <div className="meal-log-section">
        <span className="meal-log-label">Did you eat this?</span>
        <div className="meal-log-btns">
          {EAT_STATUS_OPTS.map(opt => (
            <button
              key={opt.value}
              className={`meal-log-btn ${opt.cls}${plan.log?.status === opt.value ? ' active' : ''}`}
              disabled={logMut.isPending}
              onClick={() => logMut.mutate(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {showNoteInput && (
          <input
            className="meal-log-note-input"
            placeholder="What did you actually eat? (optional)"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
            onBlur={() => {
              if (plan.log?.id && logNote !== (plan.log.notes ?? '')) {
                updateMealLog(plan.log.id, { notes: logNote })
                  .then(() => qc.invalidateQueries({ queryKey: ['meal-plans', date] }))
              }
            }}
          />
        )}
      </div>

      {/* Micro summary if present */}
      {(Object.keys(plan.vitamins).length > 0 || Object.keys(plan.minerals).length > 0) && (
        <CollapsibleSection title="Vitamins & Minerals" storageKey={`meal-micro-${plan.id}`} defaultOpen={false}>
          <div className="micro-summary">
            {Object.entries(plan.vitamins).map(([k, v]) => <span key={k} className="micro-chip">{k}: {v}%</span>)}
            {Object.entries(plan.minerals).map(([k, v]) => <span key={k} className="micro-chip">{k}: {v}%</span>)}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

// ── Meal slot section ─────────────────────────────────────────────────────────

const SLOT_LABELS: Record<string, string> = {
  breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner', snack: '🍎 Snack',
}

function MealSlotSection({
  slot, date, plans, templates, foodItems,
}: {
  slot: string; date: string; plans: MealPlan[]; templates: MealTemplate[]; foodItems: FoodItem[]
}) {
  const qc = useQueryClient()
  const [editing, setEditing]       = useState<MealPlan | null>(null)
  const [adding, setAdding]         = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const slotPlans     = plans.filter(p => p.slot === slot)
  const slotTemplates = templates.filter(t => t.slot === slot)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMealPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
    },
  })

  const applyMut = useMutation({
    mutationFn: (t: MealTemplate) => createMealPlan({
      date, slot: slot as 'breakfast' | 'lunch' | 'dinner' | 'snack', name: t.name,
      calories: t.calories ?? undefined,
      protein_g: t.protein_g ?? undefined,
      fat_g: t.fat_g ?? undefined,
      carbs_g: t.carbs_g ?? undefined,
      fiber_g: t.fiber_g ?? undefined,
      vitamins: t.vitamins, minerals: t.minerals, notes: t.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
      setPickerOpen(false)
    },
  })

  return (
    <div className="meal-slot-section">
      <div className="meal-slot-header">
        <span className="meal-slot-title">{SLOT_LABELS[slot]}</span>
        {!adding && !editing && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div className="meal-template-picker" ref={pickerRef}>
              <button className="btn-ghost-sm meal-template-trigger" title="Add from template" onClick={() => setPickerOpen(p => !p)}>⊞</button>
              {pickerOpen && (
                <div className="meal-template-dropdown">
                  {slotTemplates.length === 0
                    ? <p className="meal-template-empty">No templates yet.<br />Save a meal using 📌</p>
                    : slotTemplates.map(t => (
                        <button key={t.id} className="meal-template-option" disabled={applyMut.isPending} onClick={() => applyMut.mutate(t)}>
                          <span>{t.name}</span>
                          {t.calories && <span className="meal-template-kcal">{t.calories} kcal</span>}
                        </button>
                      ))
                  }
                </div>
              )}
            </div>
            <button className="btn-ghost-sm" onClick={() => setAdding(true)}>+ Add</button>
          </div>
        )}
      </div>

      {slotPlans.map(plan => (
        editing?.id === plan.id ? (
          <MealForm key={plan.id} slot={slot} date={date} existing={plan} onDone={() => setEditing(null)} />
        ) : (
          <MealPlanCard
            key={plan.id}
            plan={plan}
            date={date}
            foodItems={foodItems}
            onEdit={() => { setEditing(plan); setAdding(false) }}
            onDelete={() => { if (window.confirm(`Delete "${plan.name}"?`)) deleteMut.mutate(plan.id) }}
          />
        )
      ))}

      {adding && <MealForm slot={slot} date={date} onDone={() => setAdding(false)} />}
      {slotPlans.length === 0 && !adding && <p className="meal-slot-empty">Nothing planned for {slot} yet.</p>}
    </div>
  )
}

// ── Week adherence grid ───────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  as_planned: '#6ee7b7', ate_less: '#fcd34d', ate_more: '#fcd34d',
  ate_differently: '#fcd34d', skipped: '#fca5a5',
}
const SLOT_SHORT: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D', snack: 'S' }

function WeekAdherenceGrid({ currentDate }: { currentDate: string }) {
  const weekStart = getWeekStart(currentDate)
  const today     = todayStr()
  const { data: weekPlans = [] } = useQuery<MealPlan[]>({
    queryKey: ['meal-week', weekStart],
    queryFn: () => getMealWeekSummary(weekStart),
    staleTime: 60_000,
  })
  const days  = Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i))
  const slots = ['breakfast', 'lunch', 'dinner', 'snack']

  function dotColor(day: string, slot: string): string {
    const plan = weekPlans.find(p => p.date === day && p.slot === slot)
    if (!plan) return 'var(--border)'
    if (!plan.log) return 'var(--surface-muted)'
    return STATUS_COLOR[plan.log.status] ?? 'var(--border)'
  }

  return (
    <div className="week-adherence-grid">
      <div className="week-grid-label" />
      {days.map(d => (
        <div key={d} className={`week-grid-day${d === today ? ' today' : ''}`}>
          {new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}
        </div>
      ))}
      {slots.flatMap(slot => [
        <div key={`${slot}-lbl`} className="week-grid-label">{SLOT_SHORT[slot]}</div>,
        ...days.map(d => {
          const plan = weekPlans.find(p => p.date === d && p.slot === slot)
          const title = plan ? (plan.log ? `${plan.name} — ${plan.log.status.replace(/_/g, ' ')}` : `${plan.name} (not logged)`) : 'No plan'
          return (
            <div key={`${slot}-${d}`} className="week-grid-cell" title={title}>
              <div className="week-dot" style={{ background: dotColor(d, slot) }} />
            </div>
          )
        }),
      ])}
    </div>
  )
}

// ── Food library panel ────────────────────────────────────────────────────────

function FoodLibraryPanel() {
  const qc = useQueryClient()
  const [catFilter, setCatFilter]   = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'other' as FoodItem['category'],
    calories: '', protein: '', fat: '', carbs: '', fiber: '',
    saturated_fat: '', sugar: '', sodium: '', cholesterol: '',
  })

  const { data: foods = [] } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: () => listFoodItems(),
    staleTime: 120_000,
  })

  const visibleFoods = useMemo(() => {
    if (catFilter === 'all') return foods
    return foods.filter(f => f.category === catFilter)
  }, [foods, catFilter])

  const createMut = useMutation({
    mutationFn: () => createFoodItem({
      name: form.name.trim(),
      category: form.category,
      calories_per_100g:      form.calories      || undefined,
      protein_per_100g:       form.protein       || undefined,
      fat_per_100g:           form.fat           || undefined,
      carbs_per_100g:         form.carbs         || undefined,
      fiber_per_100g:         form.fiber         || undefined,
      saturated_fat_per_100g: form.saturated_fat || undefined,
      sugar_per_100g:         form.sugar         || undefined,
      sodium_mg_per_100g:     form.sodium        || undefined,
      cholesterol_mg_per_100g: form.cholesterol  || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['food-items'] })
      setForm({ name: '', category: 'other', calories: '', protein: '', fat: '', carbs: '', fiber: '', saturated_fat: '', sugar: '', sodium: '', cholesterol: '' })
      setShowAddForm(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFoodItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-items'] }),
  })

  return (
    <div>
      {/* Category filter tabs */}
      <div className="food-category-tabs">
        {FOOD_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`food-category-tab${catFilter === cat ? ' active' : ''}`}
            onClick={() => setCatFilter(cat)}
          >
            {CAT_LABEL[cat]}
          </button>
        ))}
      </div>

      <div className="food-library-table">
        {visibleFoods.length === 0 && !showAddForm && (
          <p className="empty-hint">
            {catFilter === 'all' ? 'No foods in your library yet.' : `No ${CAT_LABEL[catFilter]} foods found.`}
          </p>
        )}
        {visibleFoods.map(food => (
          <div key={food.id}>
            {/* Row */}
            <div
              className="food-library-row"
              style={{ cursor: 'pointer' }}
              onClick={() => setExpandedId(expandedId === food.id ? null : food.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <span className={`food-category-badge food-cat-${food.category}`}>{CAT_LABEL[food.category] ?? food.category}</span>
                <span className="food-library-name">{food.name}</span>
                {food.is_verified && <span className="caption" style={{ color: 'var(--accent)' }}>✓</span>}
              </div>
              <span className="food-library-macros">
                {[
                  food.calories_per_100g && `${food.calories_per_100g}cal`,
                  food.protein_per_100g  && `${food.protein_per_100g}P`,
                  food.carbs_per_100g    && `${food.carbs_per_100g}C`,
                  food.fat_per_100g      && `${food.fat_per_100g}F`,
                ].filter(Boolean).join(' · ') || 'No data'} / 100g
              </span>
              <button
                className="btn-ghost-sm"
                style={{ color: '#dc2626', flexShrink: 0 }}
                onClick={e => {
                  e.stopPropagation()
                  if (window.confirm(`Delete "${food.name}"?`)) deleteMut.mutate(food.id)
                }}
              >
                ✕
              </button>
            </div>
            {/* Expanded nutrition detail */}
            {expandedId === food.id && (
              <div style={{ padding: '6px 8px 10px', background: 'var(--surface-muted)', borderRadius: 6, marginBottom: 4 }}>
                <div className="food-nutrition-panel">
                  {food.calories_per_100g       && <span className="food-nutrition-chip">{food.calories_per_100g} kcal</span>}
                  {food.protein_per_100g        && <span className="food-nutrition-chip">{food.protein_per_100g}g Protein</span>}
                  {food.carbs_per_100g          && <span className="food-nutrition-chip">{food.carbs_per_100g}g Carbs</span>}
                  {food.fat_per_100g            && <span className="food-nutrition-chip">{food.fat_per_100g}g Fat</span>}
                  {food.fiber_per_100g          && <span className="food-nutrition-chip">{food.fiber_per_100g}g Fiber</span>}
                  {food.saturated_fat_per_100g  && <span className="food-nutrition-chip">{food.saturated_fat_per_100g}g Sat fat</span>}
                  {food.sugar_per_100g          && <span className="food-nutrition-chip">{food.sugar_per_100g}g Sugar</span>}
                  {food.sodium_mg_per_100g      && <span className="food-nutrition-chip">{food.sodium_mg_per_100g}mg Na</span>}
                  {food.cholesterol_mg_per_100g && <span className="food-nutrition-chip">{food.cholesterol_mg_per_100g}mg Chol</span>}
                </div>
                {(Object.keys(food.vitamins_per_100g ?? {}).length > 0 || Object.keys(food.minerals_per_100g ?? {}).length > 0) && (
                  <div className="food-nutrition-panel" style={{ marginTop: 4 }}>
                    {Object.entries(food.vitamins_per_100g ?? {}).map(([k, v]) => (
                      <span key={`vit-${k}`} className="food-nutrition-chip" style={{ color: 'var(--accent)' }}>Vit {k} {v}%</span>
                    ))}
                    {Object.entries(food.minerals_per_100g ?? {}).map(([k, v]) => (
                      <span key={`min-${k}`} className="food-nutrition-chip">{k} {v}%</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddForm ? (
        <div className="meal-form" style={{ marginTop: 8 }}>
          <div className="sp-field">
            <label className="sp-label">Food name *</label>
            <input className="form-input" placeholder="e.g. Chicken breast" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="sp-field">
            <label className="sp-label">Category</label>
            <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as FoodItem['category'] }))}>
              {(['protein','grain','vegetable','fruit','dairy','legume','nut','fat','beverage','other'] as const).map(c => (
                <option key={c} value={c}>{CAT_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <p className="sp-label" style={{ marginBottom: 4, marginTop: 8 }}>Per 100g — Core macros</p>
          <div className="meal-macros-grid">
            {[
              { k: 'calories' as const, label: 'kcal' },
              { k: 'protein'  as const, label: 'Protein g' },
              { k: 'carbs'    as const, label: 'Carbs g' },
              { k: 'fat'      as const, label: 'Fat g' },
              { k: 'fiber'    as const, label: 'Fiber g' },
            ].map(({ k, label }) => (
              <div key={k} className="sp-field">
                <label className="sp-label">{label}</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <p className="sp-label" style={{ marginBottom: 4, marginTop: 8 }}>Extended macros (optional)</p>
          <div className="meal-macros-grid">
            {[
              { k: 'saturated_fat' as const, label: 'Sat fat g' },
              { k: 'sugar'         as const, label: 'Sugar g' },
              { k: 'sodium'        as const, label: 'Sodium mg' },
              { k: 'cholesterol'   as const, label: 'Chol mg' },
            ].map(({ k, label }) => (
              <div key={k} className="sp-field">
                <label className="sp-label">{label}</label>
                <input className="form-input" type="number" min="0" placeholder="0" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn-primary" disabled={!form.name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? 'Saving…' : 'Add food'}
            </button>
          </div>
        </div>
      ) : (
        <button className="meal-add-ingredient-btn" style={{ marginTop: 8 }} onClick={() => setShowAddForm(true)}>
          + Add food to library
        </button>
      )}
    </div>
  )
}

// ── Micro-nutrient summary ────────────────────────────────────────────────────

function MicroNutrientSummary({ totals }: { totals: MealTotals }) {
  const allVitamins = Object.entries(totals.vitamins)
  const allMinerals = Object.entries(totals.minerals)
  if (allVitamins.length === 0 && allMinerals.length === 0) {
    return <p className="empty-hint">Add vitamin &amp; mineral data to your meals to see daily micronutrient totals.</p>
  }
  return (
    <div className="micro-grid">
      {allVitamins.length > 0 && (
        <>
          <p className="sp-label" style={{ gridColumn: '1/-1', fontWeight: 700 }}>Vitamins (%DV total)</p>
          {allVitamins.map(([k, v]) => (
            <div key={k} className={`micro-chip-large${v >= 100 ? ' micro-ok' : v >= 50 ? ' micro-mid' : ''}`}>
              <span>{k}</span><span>{v}%</span>
            </div>
          ))}
        </>
      )}
      {allMinerals.length > 0 && (
        <>
          <p className="sp-label" style={{ gridColumn: '1/-1', marginTop: 8, fontWeight: 700 }}>Minerals (%DV total)</p>
          {allMinerals.map(([k, v]) => (
            <div key={k} className={`micro-chip-large${v >= 100 ? ' micro-ok' : v >= 50 ? ' micro-mid' : ''}`}>
              <span>{k}</span><span>{v}%</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── Main MealsPage ────────────────────────────────────────────────────────────

export function MealsPage() {
  const qc = useQueryClient()
  const [date, setDate]       = useState(todayStr)
  const [copying, setCopying] = useState(false)

  const { data: plans = [], isLoading } = useQuery<MealPlan[]>({
    queryKey: ['meal-plans', date],
    queryFn: () => listMealPlans(date),
    staleTime: 30_000,
  })

  const { data: totals } = useQuery<MealTotals>({
    queryKey: ['meal-totals', date],
    queryFn: () => getMealTotals(date),
    staleTime: 30_000,
  })

  const { data: templates = [] } = useQuery<MealTemplate[]>({
    queryKey: ['meal-templates'],
    queryFn: listMealTemplates,
    staleTime: 120_000,
  })

  const { data: foodItems = [] } = useQuery<FoodItem[]>({
    queryKey: ['food-items'],
    queryFn: () => listFoodItems(),
    staleTime: 120_000,
  })

  const emptyTotals: MealTotals = useMemo(() => ({
    calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, vitamins: {}, minerals: {},
  }), [])

  const t       = totals ?? emptyTotals
  const isToday = date === todayStr()

  async function handleCopyYesterday() {
    setCopying(true)
    try {
      await copyMealDay(shiftDate(date, -1), date)
      qc.invalidateQueries({ queryKey: ['meal-plans', date] })
      qc.invalidateQueries({ queryKey: ['meal-totals', date] })
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="meals-page">
      {/* Date nav */}
      <div className="meals-date-nav">
        <button className="month-nav-btn" onClick={() => setDate(d => shiftDate(d, -1))}>‹</button>
        <span className="meals-date-label">{isToday ? 'Today' : formatDateLabel(date)}</span>
        <button className="month-nav-btn" onClick={() => setDate(d => shiftDate(d, 1))}>›</button>
        {!isToday && (
          <button className="btn-ghost-sm" onClick={() => setDate(todayStr())} style={{ marginLeft: 8 }}>Today</button>
        )}
        {!isLoading && plans.length === 0 && (
          <button className="meals-copy-btn" onClick={handleCopyYesterday} disabled={copying}>
            {copying ? '…' : '⊕ Copy yesterday'}
          </button>
        )}
      </div>

      {/* Week adherence grid */}
      <CollapsibleSection title="This Week" storageKey="meals-week-grid" defaultOpen={true}>
        <WeekAdherenceGrid currentDate={date} />
      </CollapsibleSection>

      {/* Sticky totals bar */}
      {!isLoading && <NutritionTotalsBar totals={t} />}

      {/* Meal slots */}
      {isLoading ? (
        <p className="empty-hint">Loading…</p>
      ) : (
        <>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(slot => (
            <MealSlotSection
              key={slot}
              slot={slot}
              date={date}
              plans={plans}
              templates={templates}
              foodItems={foodItems}
            />
          ))}
        </>
      )}

      {/* Micro summary */}
      {(Object.keys(t.vitamins).length > 0 || Object.keys(t.minerals).length > 0) && (
        <CollapsibleSection title="Daily Micronutrients" storageKey="meals-micros" defaultOpen={false}>
          <MicroNutrientSummary totals={t} />
        </CollapsibleSection>
      )}

      {/* Food library */}
      <CollapsibleSection title="Food Library" storageKey="meals-food-library" defaultOpen={false}>
        <FoodLibraryPanel />
      </CollapsibleSection>
    </div>
  )
}
