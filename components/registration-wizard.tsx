"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Shield,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  MapPin,
  KeyRound,
  ClipboardList,
  Loader2
} from "lucide-react"
import {
  BARANGAYS_SANTA_CRUZ,
  ALL_SCHOOLS,
  OCCUPATION_CATEGORIES,
  GENDER_OPTIONS,
  GRADE_LEVELS,
  getScoreRating
} from "@/lib/constants"

// Types
interface AssessmentQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  category: string
}

interface RegistrationData {
  // Step 1: Basic Info
  firstName: string
  lastName: string
  middleName: string
  age: string
  gender: string

  // Step 2: Location & Background
  barangay: string
  school: string
  schoolOther: string
  occupation: string
  occupationOther: string
  gradeLevel: string

  // Step 3: Account
  username: string
  email: string
  password: string
  confirmPassword: string
  dataPrivacyConsent: boolean

  // Step 4: Pre-Test Answers
  preTestAnswers: Record<number, number> // questionId -> selectedAnswerIndex
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: User, description: "Tell us about yourself" },
  { id: 2, title: "Location", icon: MapPin, description: "Where are you from?" },
  { id: 3, title: "Account", icon: KeyRound, description: "Create your account" },
  { id: 4, title: "Pre-Test", icon: ClipboardList, description: "Quick assessment" },
]

export function RegistrationWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean
    score?: number
    maxScore?: number
    user?: any
  } | null>(null)

  const [data, setData] = useState<RegistrationData>({
    firstName: "",
    lastName: "",
    middleName: "",
    age: "",
    gender: "",
    barangay: "",
    school: "",
    schoolOther: "",
    occupation: "",
    occupationOther: "",
    gradeLevel: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dataPrivacyConsent: false,
    preTestAnswers: {},
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Fetch pre-test questions when reaching step 4
  useEffect(() => {
    if (currentStep === 4 && questions.length === 0) {
      fetchQuestions()
    }
  }, [currentStep])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const role = parseInt(data.age) < 18 ? "kid" : "adult"
      const response = await fetch(`/api/assessment/questions?role=${role}&type=preTest`)
      if (response.ok) {
        const result = await response.json()
        setQuestions(result.questions || [])
      } else {
        setError("Failed to load assessment questions")
      }
    } catch (err) {
      setError("Failed to load assessment questions")
    } finally {
      setLoading(false)
    }
  }

  const isKid = parseInt(data.age) < 18

  const autoCapitalize = (text: string) =>
    text.replace(/\b\w/g, (char) => char.toUpperCase())

  const updateField = (field: keyof RegistrationData, value: any) => {
    // Auto-capitalize first letter of each word for name fields
    if (field === "firstName" || field === "lastName" || field === "middleName") {
      value = autoCapitalize(value as string)
    }
    setData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!data.lastName.trim()) errors.lastName = "Last Name is required"
        if (!data.firstName.trim()) errors.firstName = "First Name is required"
        if (!data.age) errors.age = "Age is required"
        else if (parseInt(data.age) < 1 || parseInt(data.age) > 120) errors.age = "Please enter a valid age"
        if (!data.gender) errors.gender = "Please select your gender"
        break

      case 2:
        if (!data.barangay) errors.barangay = "Please select your barangay"
        if (isKid) {
          if (!data.school) errors.school = "Please select your school"
          if (data.school === "Other (Please specify)" && !data.schoolOther.trim()) {
            errors.schoolOther = "Please specify your school"
          }
          if (!data.gradeLevel) errors.gradeLevel = "Please select your grade level"
        } else {
          if (!data.occupation) errors.occupation = "Please select your occupation"
          if (data.occupation === "Other (Please specify)" && !data.occupationOther.trim()) {
            errors.occupationOther = "Please specify your occupation"
          }
        }
        break

      case 3:
        if (!data.username.trim()) errors.username = "Username is required"
        else if (data.username.length < 3 || data.username.length > 20) {
          errors.username = "Username must be 3-20 characters"
        } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
          errors.username = "Username can only contain letters, numbers, and underscores"
        }
        if (!data.email.trim()) errors.email = "Email is required"
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Please enter a valid email address"
        if (!data.password) errors.password = "Password is required"
        else if (data.password.length < 8) errors.password = "Password must be at least 8 characters"
        if (data.password !== data.confirmPassword) errors.confirmPassword = "Passwords do not match"
        if (!data.dataPrivacyConsent) errors.dataPrivacyConsent = "You must agree to the data privacy policy"
        break

      case 4:
        // Check if all questions are answered
        if (Object.keys(data.preTestAnswers).length < questions.length) {
          errors.preTest = "Please answer all questions"
        }
        break
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/auth/check-username?username=${username}`)
      const result = await response.json()

      if (result.error) {
        return false
      }

      return result.available
    } catch (error) {
      console.error('Error checking username:', error)
      return false
    }
  }

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Validate ALL credentials against the server before proceeding to the pre-test
        setLoading(true)
        setError("")
        try {
          const response = await fetch('/api/auth/validate-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: data.username,
              password: data.password,
              email: data.email || undefined,
            }),
          })
          const result = await response.json()

          if (!result.valid) {
            // Show server-side validation errors
            const serverErrors: Record<string, string> = {}
            if (result.errors?.username) serverErrors.username = result.errors.username
            if (result.errors?.password) serverErrors.password = result.errors.password
            if (result.errors?.email) serverErrors.email = result.errors.email
            setValidationErrors(prev => ({ ...prev, ...serverErrors }))
            setError(Object.values(result.errors || {}).join('. '))
            setLoading(false)
            return
          }
        } catch (err) {
          setError('Failed to validate credentials. Please try again.')
          setLoading(false)
          return
        }
        setLoading(false)
      }

      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1)
        setError("")
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
      setError("")
    }
  }

  const handleAnswerQuestion = (questionId: number, answerIndex: number) => {
    setData(prev => ({
      ...prev,
      preTestAnswers: {
        ...prev.preTestAnswers,
        [questionId]: answerIndex
      }
    }))
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName || undefined,
          age: parseInt(data.age),
          gender: data.gender,
          barangay: data.barangay,
          school: data.school === "Other (Please specify)" ? data.schoolOther : data.school,
          schoolOther: data.school === "Other (Please specify)" ? data.schoolOther : null,
          occupation: data.occupation === "Other (Please specify)" ? data.occupationOther : data.occupation,
          occupationOther: data.occupation === "Other (Please specify)" ? data.occupationOther : null,
          gradeLevel: data.gradeLevel || null,
          username: data.username,
          email: data.email || undefined,
          password: data.password,
          dataPrivacyConsent: data.dataPrivacyConsent,
          preTestAnswers: data.preTestAnswers,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setRegistrationResult({
          success: true,
          score: result.preTestScore,
          maxScore: result.maxScore,
          user: result.user,
        })
        // Store user in localStorage
        localStorage.setItem("user", JSON.stringify(result.user))
      } else {
        setError(result.error || "Registration failed")
      }
    } catch (err) {
      setError("Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    // Small delay to ensure cookie is fully set before middleware checks it
    // This fixes a race condition where navigation happens before cookie propagation
    await new Promise(resolve => setTimeout(resolve, 100))

    // Redirect based on role
    if (registrationResult?.user) {
      const role = registrationResult.user.role
      if (role === "kid") router.push("/kids")
      else if (role === "adult") router.push("/adult")
      else if (role === "professional") router.push("/professional")
      else router.push("/")
    } else {
      router.push("/")
    }
  }

  // Show results after registration
  if (registrationResult?.success) {
    const percentage = registrationResult.maxScore
      ? Math.round((registrationResult.score! / registrationResult.maxScore) * 100)
      : 0
    const rating = getScoreRating(percentage)

    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Registration Complete!</CardTitle>
          <CardDescription>Welcome to SafeScape Fire Safety Learning</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Your Pre-Test Score</p>
            <div className="text-4xl font-bold" style={{ color: rating.color }}>
              {registrationResult.score} / {registrationResult.maxScore}
            </div>
            <p className="text-lg font-medium mt-2" style={{ color: rating.color }}>
              {rating.label}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              This is your baseline score. Complete modules and activities to unlock the Post-Test
              and see how much you&apos;ve improved!
            </p>
          </div>

          <Button onClick={handleContinue} className="w-full" size="lg">
            Start Learning
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-8 w-8 text-orange-500" />
          <span className="text-xl font-bold">SafeScape</span>
        </div>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
        </CardDescription>

        {/* Progress Indicator */}
        <div className="mt-4">
          <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${isCompleted ? "text-green-600" : isCurrent ? "text-orange-500" : "text-gray-400"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? "bg-green-100" : isCurrent ? "bg-orange-100" : "bg-gray-100"
                    }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={data.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className={validationErrors.lastName ? "border-red-500" : ""}
              />
              {validationErrors.lastName && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.lastName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={data.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className={validationErrors.firstName ? "border-red-500" : ""}
              />
              {validationErrors.firstName && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.firstName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="middleName">Middle Name (Optional)</Label>
              <Input
                id="middleName"
                placeholder="Enter your middle name"
                value={data.middleName}
                onChange={(e) => updateField("middleName", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter your age"
                min="1"
                max="120"
                value={data.age}
                onChange={(e) => updateField("age", e.target.value)}
                className={validationErrors.age ? "border-red-500" : ""}
              />
              {validationErrors.age && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.age}</p>
              )}
            </div>

            <div>
              <Label>Gender *</Label>
              <Select value={data.gender} onValueChange={(value) => updateField("gender", value)}>
                <SelectTrigger className={validationErrors.gender ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.gender && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.gender}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Location & Background */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Barangay *</Label>
              <Select value={data.barangay} onValueChange={(value) => updateField("barangay", value)}>
                <SelectTrigger className={validationErrors.barangay ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select your barangay" />
                </SelectTrigger>
                <SelectContent>
                  {BARANGAYS_SANTA_CRUZ.map((brgy) => (
                    <SelectItem key={brgy} value={brgy}>{brgy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.barangay && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.barangay}</p>
              )}
            </div>

            {isKid ? (
              <>
                <div>
                  <Label>School *</Label>
                  <Select value={data.school} onValueChange={(value) => updateField("school", value)}>
                    <SelectTrigger className={validationErrors.school ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_SCHOOLS.map((school) => (
                        <SelectItem key={school} value={school}>{school}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.school && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.school}</p>
                  )}
                </div>

                {data.school === "Other (Please specify)" && (
                  <div>
                    <Label htmlFor="schoolOther">Specify School *</Label>
                    <Input
                      id="schoolOther"
                      placeholder="Enter your school name"
                      value={data.schoolOther}
                      onChange={(e) => updateField("schoolOther", e.target.value)}
                      className={validationErrors.schoolOther ? "border-red-500" : ""}
                    />
                    {validationErrors.schoolOther && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.schoolOther}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Grade Level *</Label>
                  <Select value={data.gradeLevel} onValueChange={(value) => updateField("gradeLevel", value)}>
                    <SelectTrigger className={validationErrors.gradeLevel ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select your grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.gradeLevel && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.gradeLevel}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Occupation *</Label>
                  <Select value={data.occupation} onValueChange={(value) => updateField("occupation", value)}>
                    <SelectTrigger className={validationErrors.occupation ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select your occupation" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPATION_CATEGORIES.map((occ) => (
                        <SelectItem key={occ} value={occ}>{occ}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.occupation && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.occupation}</p>
                  )}
                </div>

                {data.occupation === "Other (Please specify)" && (
                  <div>
                    <Label htmlFor="occupationOther">Specify Occupation *</Label>
                    <Input
                      id="occupationOther"
                      placeholder="Enter your occupation"
                      value={data.occupationOther}
                      onChange={(e) => updateField("occupationOther", e.target.value)}
                      className={validationErrors.occupationOther ? "border-red-500" : ""}
                    />
                    {validationErrors.occupationOther && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.occupationOther}</p>
                    )}
                  </div>
                )}

                {data.occupation === "Student" && (
                  <div>
                    <Label>School (Optional)</Label>
                    <Select value={data.school} onValueChange={(value) => updateField("school", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your school" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_SCHOOLS.map((school) => (
                          <SelectItem key={school} value={school}>{school}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Account */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Choose a username"
                value={data.username}
                onChange={(e) => updateField("username", e.target.value)}
                className={validationErrors.username ? "border-red-500" : ""}
              />
              {validationErrors.username && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={data.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={data.password}
                onChange={(e) => updateField("password", e.target.value)}
                className={validationErrors.password ? "border-red-500" : ""}
              />
              {validationErrors.password && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={data.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                className={validationErrors.confirmPassword ? "border-red-500" : ""}
              />
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-4">
              <Checkbox
                id="consent"
                checked={data.dataPrivacyConsent}
                onCheckedChange={(checked) => updateField("dataPrivacyConsent", checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="consent"
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${validationErrors.dataPrivacyConsent ? "text-red-500" : ""
                    }`}
                >
                  I agree to the Data Privacy Policy *
                </label>
                <p className="text-xs text-muted-foreground">
                  Your data (barangay, school) will be used for community fire safety analytics.
                  Individual information is kept confidential and only aggregated data is shared.
                </p>
              </div>
            </div>
            {validationErrors.dataPrivacyConsent && (
              <p className="text-sm text-red-500">{validationErrors.dataPrivacyConsent}</p>
            )}
          </div>
        )}

        {/* Step 4: Pre-Test */}
        {currentStep === 4 && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <span className="ml-2">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No questions available</p>
                <Button onClick={fetchQuestions} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>{Object.keys(data.preTestAnswers).length} answered</span>
                  </div>
                  <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-orange-600 mb-2">
                    {questions[currentQuestionIndex].category}
                  </p>
                  <h3 className="text-lg font-medium mb-4">
                    {questions[currentQuestionIndex].question}
                  </h3>

                  <RadioGroup
                    value={data.preTestAnswers[questions[currentQuestionIndex].id]?.toString() || ""}
                    onValueChange={(value) => handleAnswerQuestion(questions[currentQuestionIndex].id, parseInt(value))}
                  >
                    {questions[currentQuestionIndex].options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-100">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Question Navigation */}
                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      disabled={data.preTestAnswers[questions[currentQuestionIndex].id] === undefined}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || Object.keys(data.preTestAnswers).length < questions.length}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Complete Registration
                          <Check className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Question dots for quick navigation */}
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${currentQuestionIndex === idx
                        ? "bg-orange-500 text-white"
                        : data.preTestAnswers[q.id] !== undefined
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {validationErrors.preTest && (
                  <p className="text-sm text-red-500 text-center mt-2">{validationErrors.preTest}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {currentStep === 4 && questions.length > 0 && (
          <div className="flex justify-start mt-6">
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
