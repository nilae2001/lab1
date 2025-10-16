import { useState } from 'react'

interface UploadExpenseFormProps {
  expenseId: string
  onSuccess?: () => void  // ✅ add this line
}

export default function UploadExpenseForm({ expenseId, onSuccess }: UploadExpenseFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Please select a file first.')
      return
    }

    try {
      setIsUploading(true)

      // 1️⃣ Get signed URL
      const signRes = await fetch('/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filename: file.name, type: file.type }),
      })
      if (!signRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, key } = await signRes.json()

      // 2️⃣ Upload file to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Failed to upload to S3')

      // 3️⃣ Update expense record
      const updateRes = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileUrl: key }),
      })
      if (!updateRes.ok) throw new Error('Failed to update expense')

      // ✅ Clear and notify parent
      setFile(null)
      onSuccess?.() // <-- ✅ safely call if provided
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Something went wrong')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={isUploading}
      />
      <button
        type="submit"
        disabled={isUploading || !file}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {isUploading ? 'Uploading...' : 'Upload File'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  )
}
