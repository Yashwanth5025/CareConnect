import React from 'react'

const Bottompannel = () => {
  return (
    <div>
      <div className="mt-8 bg-teal-200 rounded-lg p-4 flex flex-wrap justify-between items-center text-sm font-medium">
      <button className="bg-teal-300 py-2 px-4 rounded-lg shadow-md hover:bg-teal-400">
        + Add Other Record
      </button>
      <div className="flex items-center gap-2 text-teal-900">
        <span className="text-xl">✅</span>
        <span className="underline cursor-pointer">Insurance Details</span>
      </div>
      <div className="text-teal-900 underline cursor-pointer">Insurance Details &gt;</div>
      <div className="text-teal-900 underline cursor-pointer">Contact Information &gt;</div>
    </div>
    </div>
  )
}

export default Bottompannel
