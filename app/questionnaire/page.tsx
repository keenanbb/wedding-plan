'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface DateRange {
  start: string
  end: string
}

const STEPS = [
  {
    id: 'date',
    title: 'Wedding Date',
    question: 'When are you planning your wedding?',
    type: 'select' as const,
    options: [
      { value: 'specific', label: 'We have a specific date', needsDate: true },
      { value: 'flexible', label: 'We have some dates in mind' },
      { value: 'deciding', label: "We're still deciding" },
    ],
  },
  {
    id: 'location',
    title: 'Location',
    question: 'Where would you like to celebrate?',
    type: 'select' as const,
    options: [
      { value: 'Sydney', label: 'Sydney & surrounds' },
      { value: 'Newcastle', label: 'Newcastle' },
      { value: 'Blue Mountains', label: 'Blue Mountains' },
      { value: 'Hunter Valley', label: 'Hunter Valley' },
      { value: 'South Coast', label: 'South Coast' },
      { value: 'custom', label: 'Other area' },
    ],
  },
  {
    id: 'guestCount',
    title: 'Guest Count',
    question: 'How many guests are you planning to invite?',
    type: 'select' as const,
    options: [
      { value: '40', label: 'Intimate (under 50)' },
      { value: '75', label: 'Medium (50-100)' },
      { value: '125', label: 'Large (100-150)' },
      { value: '200', label: 'Grand (150+)' },
      { value: 'custom', label: 'Enter exact number' },
    ],
  },
  {
    id: 'budget',
    title: 'Budget',
    question: "What's your estimated total budget?",
    type: 'select' as const,
    options: [
      { value: '25000', label: 'Under $30,000' },
      { value: '40000', label: '$30,000 - $50,000' },
      { value: '65000', label: '$50,000 - $80,000' },
      { value: '100000', label: 'Above $80,000' },
      { value: 'custom', label: 'Enter exact amount' },
    ],
  },
  {
    id: 'style',
    title: 'Style',
    question: 'What style resonates with your vision?',
    type: 'select' as const,
    options: [
      { value: 'Modern', label: 'Modern & Minimalist' },
      { value: 'Rustic', label: 'Rustic & Outdoor' },
      { value: 'Classic', label: 'Classic & Elegant' },
      { value: 'Bohemian', label: 'Bohemian & Relaxed' },
      { value: 'Luxury', label: 'Luxury & Glamorous' },
    ],
  },
]

export default function QuestionnairePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [specificDate, setSpecificDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showDateRanges, setShowDateRanges] = useState(false)
  const [dateRanges, setDateRanges] = useState<DateRange[]>([{ start: '', end: '' }])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentStepData = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  // Fetch existing wedding data on mount
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const response = await fetch('/api/wedding')
        if (response.ok) {
          const data = await response.json()
          if (data.wedding) {
            // Convert database values back to form values
            const existing = data.wedding
            const existingFormData: Record<string, string> = {}

            // Map database values to form option values
            if (existing.weddingDate && !existing.dateFlexible) {
              existingFormData.date = 'specific'
              setSpecificDate(existing.weddingDate.split('T')[0])
            } else if (existing.dateFlexible && existing.preferredDates) {
              existingFormData.date = 'flexible'
              setDateRanges(existing.preferredDates as DateRange[])
            } else {
              existingFormData.date = 'deciding'
            }

            // Location - check if it's a preset value
            const presetLocations = ['Sydney', 'Newcastle', 'Blue Mountains', 'Hunter Valley', 'South Coast']
            if (existing.location && !presetLocations.includes(existing.location)) {
              existingFormData.location = existing.location
            } else {
              existingFormData.location = existing.location || ''
            }

            existingFormData.guestCount = existing.guestCount?.toString() || ''
            existingFormData.budget = (existing.budgetTotal / 100).toString() || ''
            existingFormData.style = existing.style || ''

            setFormData(existingFormData)
          }
        }
      } catch (err) {
        console.error('Error fetching wedding data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExistingData()
  }, [])

  const handleOptionSelect = (value: string) => {
    // If selecting "custom", show custom input instead of moving to next step
    if (value === 'custom') {
      if (currentStepData.id === 'location') {
        setShowCustomInput(true)
        setCustomValue('')
      } else {
        setShowCustomInput(true)
        setCustomValue('')
      }
      return
    }

    // If selecting "flexible", show date ranges
    if (value === 'flexible' && currentStepData.id === 'date') {
      const newData = { ...formData, [currentStepData.id]: value }
      setFormData(newData)
      setShowDateRanges(true)
      return
    }

    const newData = { ...formData, [currentStepData.id]: value }
    setFormData(newData)

    // If selecting "specific date", show date picker instead of moving to next step
    if (value === 'specific' && currentStepData.id === 'date') {
      setShowDatePicker(true)
      return
    }

    // If this is the last step, submit
    if (currentStep === STEPS.length - 1) {
      handleSubmit(newData)
    } else {
      // Move to next step
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
      }, 300)
    }
  }

  const handleCustomConfirm = () => {
    if (currentStepData.id === 'location') {
      // Text validation for location
      if (!customValue.trim()) {
        setError('Please enter your suburb or area')
        return
      }
      setError(null)
      setShowCustomInput(false)

      const newData = { ...formData, [currentStepData.id]: customValue.trim() }
      setFormData(newData)

      if (currentStep === STEPS.length - 1) {
        handleSubmit(newData)
      } else {
        setTimeout(() => {
          setCurrentStep(currentStep + 1)
        }, 300)
      }
    } else {
      // Number validation for guestCount/budget
      const num = parseInt(customValue)
      if (!num || num <= 0) {
        setError(currentStepData.id === 'budget' ? 'Please enter a valid amount' : 'Please enter a valid number')
        return
      }
      setError(null)
      setShowCustomInput(false)

      const newData = { ...formData, [currentStepData.id]: num.toString() }
      setFormData(newData)

      if (currentStep === STEPS.length - 1) {
        handleSubmit(newData)
      } else {
        setTimeout(() => {
          setCurrentStep(currentStep + 1)
        }, 300)
      }
    }
  }

  const handleDateRangesConfirm = () => {
    // Validate: at least 1 range with both dates set, end >= start
    const validRanges = dateRanges.filter(r => r.start && r.end)
    if (validRanges.length === 0) {
      setError('Please add at least one date range with both dates filled in')
      return
    }
    for (const range of validRanges) {
      if (range.end < range.start) {
        setError('End date must be on or after start date')
        return
      }
    }
    setError(null)
    setShowDateRanges(false)
    setDateRanges(validRanges)

    setTimeout(() => {
      setCurrentStep(currentStep + 1)
    }, 300)
  }

  const handleDateConfirm = () => {
    if (!specificDate) {
      setError('Please select a date')
      return
    }
    setShowDatePicker(false)
    setError(null)
    // Move to next step after date is confirmed
    setTimeout(() => {
      setCurrentStep(currentStep + 1)
    }, 300)
  }

  const addDateRange = () => {
    setDateRanges([...dateRanges, { start: '', end: '' }])
  }

  const removeDateRange = (index: number) => {
    setDateRanges(dateRanges.filter((_, i) => i !== index))
  }

  const updateDateRange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...dateRanges]
    updated[index] = { ...updated[index], [field]: value }
    setDateRanges(updated)
  }

  const handleSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        date: data.date,
        specificDate: data.date === 'specific' ? specificDate : null,
        location: data.location,
        guestCount: data.guestCount,
        budget: data.budget,
        style: data.style,
      }

      // Include preferredDates for flexible mode
      if (data.date === 'flexible') {
        payload.preferredDates = dateRanges.filter(r => r.start && r.end)
      }

      const response = await fetch('/api/wedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save wedding data')
      }

      // Redirect to vendor matches
      router.push('/vendors')
      router.refresh()
    } catch (err) {
      console.error('Error saving wedding:', err)
      setError('Failed to save your details. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-50 dark:bg-gray-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-stone-200/15 to-stone-100/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-stone-200/15 to-stone-100/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.02)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.03)_1px,transparent_0)] bg-[size:32px_32px]" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-md dark:hover:shadow-gray-900/30 transition-all duration-300 group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="font-light text-sm">Back to Dashboard</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          {isLoading ? (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-light">Loading your details...</span>
            </div>
          ) : (
          <div className="max-w-2xl w-full space-y-8">
            {/* Progress Bar */}
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-light">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <span className="text-gray-500 dark:text-gray-400 font-light">{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-stone-900 dark:bg-stone-100 h-2 rounded-full transition-all duration-700 shadow-sm shadow-amber-600/30"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div
              className="bg-white dark:bg-stone-900 rounded-xl p-8 md:p-12 shadow-2xl dark:shadow-gray-900/30 border border-stone-200 dark:border-stone-800 animate-fadeIn"
              key={currentStep}
            >
              {/* Step Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300" />
                <span className="text-sm font-medium tracking-wide text-amber-800 dark:text-amber-400 uppercase">
                  {currentStepData.title}
                </span>
              </div>

              {/* Question */}
              <h2 className="text-3xl md:text-4xl font-serif font-light text-gray-900 dark:text-white mb-8 leading-tight">
                {currentStepData.question}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {currentStepData.options.map((option, index) => {
                  const isSelected = formData[currentStepData.id] === option.value
                  return (
                  <button
                    key={option.value}
                    onClick={() => handleOptionSelect(option.value)}
                    disabled={isSubmitting}
                    className={`group w-full text-left px-6 py-5 border-2 rounded-2xl transition-all duration-300 hover:shadow-xl dark:hover:shadow-gray-900/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed animate-fadeIn ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-950/30 dark:to-stone-900/30 border-amber-300 dark:border-amber-800'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-800'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-700 dark:text-gray-200 group-hover:text-amber-800 dark:group-hover:text-amber-700 transition-colors">
                        {option.label}
                      </span>
                      <svg
                        className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-amber-800 dark:group-hover:text-amber-700 group-hover:translate-x-1 transition-all"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                  )
                })}
              </div>

              {/* Custom Input - shown for guestCount, budget, or location */}
              {showCustomInput && (currentStepData.id === 'guestCount' || currentStepData.id === 'budget' || currentStepData.id === 'location') && (
                <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-950/30 dark:to-stone-900/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl animate-fadeIn">
                  <label htmlFor="customValue" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    {currentStepData.id === 'budget' ? 'Enter your budget (AUD)' : currentStepData.id === 'location' ? 'Enter your suburb or area' : 'Enter your guest count'}
                  </label>
                  <div className="relative">
                    {currentStepData.id === 'budget' && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">$</span>
                    )}
                    <input
                      type={currentStepData.id === 'location' ? 'text' : 'number'}
                      id="customValue"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      min={currentStepData.id === 'location' ? undefined : 1}
                      step={currentStepData.id === 'budget' ? 1000 : currentStepData.id === 'location' ? undefined : 1}
                      placeholder={currentStepData.id === 'budget' ? '42000' : currentStepData.id === 'location' ? 'e.g. Coogee, Wollongong, Central Coast' : '87'}
                      className={`w-full ${currentStepData.id === 'budget' ? 'pl-8' : 'pl-4'} pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 dark:focus:ring-amber-700/30 focus:border-transparent transition-all text-gray-900 dark:text-white`}
                    />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleCustomConfirm}
                      className="flex-1 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:shadow-lg dark:hover:shadow-gray-900/30 hover:scale-[1.02] transition-all duration-300"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInput(false)
                        setCustomValue('')
                      }}
                      className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Date Picker - shown when "specific date" is selected */}
              {showDatePicker && currentStepData.id === 'date' && (
                <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-950/30 dark:to-stone-900/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl animate-fadeIn">
                  <label htmlFor="specificDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Select your wedding date
                  </label>
                  <input
                    type="date"
                    id="specificDate"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} // Can't select past dates
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600 dark:focus:ring-amber-700/30 focus:border-transparent transition-all text-gray-900 dark:text-white dark:[color-scheme:dark]"
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleDateConfirm}
                      className="flex-1 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:shadow-lg dark:hover:shadow-gray-900/30 hover:scale-[1.02] transition-all duration-300"
                    >
                      Confirm Date
                    </button>
                    <button
                      onClick={() => {
                        setShowDatePicker(false)
                        setFormData({ ...formData, date: '' })
                        setSpecificDate('')
                      }}
                      className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                  {specificDate && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-center">
                      Selected: {new Date(specificDate + 'T00:00:00').toLocaleDateString('en-AU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Date Ranges - shown when "flexible" is selected */}
              {showDateRanges && currentStepData.id === 'date' && (
                <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-950/30 dark:to-stone-900/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl animate-fadeIn">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-4">
                    Add your preferred date ranges
                  </label>
                  <div className="space-y-3">
                    {dateRanges.map((range, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
                            <input
                              type="date"
                              value={range.start}
                              onChange={(e) => updateDateRange(index, 'start', e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 dark:focus:ring-amber-700/30 focus:border-transparent text-sm text-gray-900 dark:text-white dark:[color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
                            <input
                              type="date"
                              value={range.end}
                              onChange={(e) => updateDateRange(index, 'end', e.target.value)}
                              min={range.start || new Date().toISOString().split('T')[0]}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 dark:focus:ring-amber-700/30 focus:border-transparent text-sm text-gray-900 dark:text-white dark:[color-scheme:dark]"
                            />
                          </div>
                        </div>
                        {dateRanges.length > 1 && (
                          <button
                            onClick={() => removeDateRange(index)}
                            className="mt-5 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Remove range"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addDateRange}
                    className="mt-3 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                    Add another date range
                  </button>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={handleDateRangesConfirm}
                      className="flex-1 px-6 py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-medium hover:shadow-lg dark:hover:shadow-gray-900/30 hover:scale-[1.02] transition-all duration-300"
                    >
                      Confirm Dates
                    </button>
                    <button
                      onClick={() => {
                        setShowDateRanges(false)
                        setFormData({ ...formData, date: '' })
                        setDateRanges([{ start: '', end: '' }])
                      }}
                      className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Back Button */}
              {currentStep > 0 && !isSubmitting && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span>Previous question</span>
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isSubmitting && (
                <div className="mt-8 flex items-center justify-center gap-3 text-gray-600 dark:text-gray-300">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="font-light">Saving your details...</span>
                </div>
              )}
            </div>

            {/* Helper Text */}
            <div className="text-center space-y-3 animate-fadeIn">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Your data is secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Can be edited later</span>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
