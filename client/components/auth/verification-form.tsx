'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VERIFICATION_STEPS } from '@/lib/constants'
import { CheckCircle2, Circle, Upload } from 'lucide-react'

export function VerificationForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [verificationData, setVerificationData] = useState({
    email: '',
    phone: '',
    idDocument: null as File | null,
    skills: [] as string[],
  })

  const handleNext = () => {
    if (currentStep < VERIFICATION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete verification
      router.push('/dashboard')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVerificationData((prev) => ({ ...prev, idDocument: file }))
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">Enter your email to verify</p>
            <Input
              type="email"
              placeholder="your@email.com"
              value={verificationData.email}
              onChange={(e) => setVerificationData((prev) => ({ ...prev, email: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">We'll send you a verification code</p>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">Enter your phone number</p>
            <Input
              type="tel"
              placeholder="+251 9xx xxx xxxx"
              value={verificationData.phone}
              onChange={(e) => setVerificationData((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Required for account security</p>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">Upload a government-issued ID</p>
            <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary transition-colors">
              <div className="text-center">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              </div>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {verificationData.idDocument && (
              <p className="text-sm text-primary">✓ {verificationData.idDocument.name} uploaded</p>
            )}
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground mb-4">Verify your skills (optional)</p>
            <p className="text-sm text-muted-foreground">You can add skills later in your profile</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verify Your Account</h1>
        <p className="text-muted-foreground">Complete these steps to unlock all features</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-12">
        <div className="flex justify-between mb-8">
          {VERIFICATION_STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    idx < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : idx === currentStep
                      ? 'border-2 border-primary bg-primary/10'
                      : 'border-2 border-border'
                  }`}
                >
                  {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                {idx < VERIFICATION_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-colors ${
                      idx < currentStep ? 'bg-primary' : 'bg-border'
                    }`}
                  ></div>
                )}
              </div>
              <p className="text-xs font-medium mt-2 text-center">{step.name}</p>
            </div>
          ))}
        </div>

        {/* Current Step */}
        <div className="bg-card rounded-lg border border-border p-8">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-4xl">{VERIFICATION_STEPS[currentStep].icon}</span>
            <div>
              <h2 className="text-2xl font-bold">{VERIFICATION_STEPS[currentStep].name}</h2>
              <p className="text-muted-foreground">{VERIFICATION_STEPS[currentStep].description}</p>
            </div>
          </div>

          <div className="mt-8">
            {renderStepContent()}
          </div>

          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {currentStep === VERIFICATION_STEPS.length - 1 ? 'Complete' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        You can skip verification and complete it later in your profile settings
      </p>
    </div>
  )
}
