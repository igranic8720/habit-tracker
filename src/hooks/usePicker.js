import { useState } from 'react'

// the state behind a WhatPicker: the chosen option and the typed label
export function usePicker(habits) {
  const [value, setValue] = useState('workout')
  const [other, setOther] = useState('')
  const valid = value === 'other' ? other.trim() !== '' : value !== 'workout' ? habits.some((h) => `h:${h.id}` === value) : true
  return { value, setValue, other, setOther, valid }
}
