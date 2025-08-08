import React from 'react'
import { StoreEditor } from './StoreEditor'

const StoreEditorDemo = () => {
  return (
    <div className="h-screen bg-gray-100">
      <div className="p-4 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 text-right">
          محرر المتجر الجديد
        </h1>
        <p className="text-gray-600 text-right mt-2">
          قم بتصميم وتخصيص متجرك الإلكتروني بطريقة سهلة ومرنة
        </p>
      </div>
      <StoreEditor />
    </div>
  )
}

export default StoreEditorDemo
