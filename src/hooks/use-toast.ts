import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5  // السماح بـ 5 إشعارات في نفس الوقت
const TOAST_REMOVE_DELAY = 5000  // 5 ثواني ثم يختفي

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

type ToastInput = Toast & { variant?: ToastProps["variant"] }

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !React.isValidElement(value as any)

function baseToast({ ...props }: ToastInput) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

const createPresetToast = (
  variant: ToastProps["variant"],
  titleOrOptions: React.ReactNode | Partial<ToastInput>,
  options?: Partial<ToastInput>
) => {
  if (isPlainObject(titleOrOptions)) {
    const mergedOptions = {
      variant,
      ...titleOrOptions,
      ...options,
    } as ToastInput
    return baseToast(mergedOptions)
  }

  const mergedOptions: ToastInput = {
    title: titleOrOptions,
    variant,
    ...options,
  }
  return baseToast(mergedOptions)
}

type SuccessErrorOptions = Partial<Omit<ToastInput, "title">> & {
  title?: React.ReactNode
}

type PromiseMessages<T> = {
  loading: React.ReactNode | SuccessErrorOptions
  success: React.ReactNode | SuccessErrorOptions | ((value: T) => React.ReactNode | SuccessErrorOptions)
  error: React.ReactNode | SuccessErrorOptions | ((error: unknown) => React.ReactNode | SuccessErrorOptions)
}

const toast = Object.assign(
  (props: ToastInput) => baseToast(props),
  {
    success: (
      titleOrOptions: React.ReactNode | SuccessErrorOptions,
      options?: SuccessErrorOptions
    ) => createPresetToast("default", titleOrOptions, options),
    error: (
      titleOrOptions: React.ReactNode | SuccessErrorOptions,
      options?: SuccessErrorOptions
    ) => createPresetToast("destructive", titleOrOptions, options),
    info: (
      titleOrOptions: React.ReactNode | SuccessErrorOptions,
      options?: SuccessErrorOptions
    ) => createPresetToast("default", titleOrOptions, options),
    warning: (
      titleOrOptions: React.ReactNode | SuccessErrorOptions,
      options?: SuccessErrorOptions
    ) => createPresetToast("default", titleOrOptions, options),
    promise: async <T>(promise: Promise<T>, messages: PromiseMessages<T>) => {
      const loadingToast = createPresetToast("default", messages.loading)
      try {
        const result = await promise
        const successMessage =
          typeof messages.success === "function"
            ? messages.success(result)
            : messages.success
        loadingToast.update({
          ...(isPlainObject(successMessage)
            ? (successMessage as ToasterToast)
            : { title: successMessage }),
          id: loadingToast.id,
          open: true,
        })
        addToRemoveQueue(loadingToast.id)
        return result
      } catch (error) {
        const errorMessage =
          typeof messages.error === "function"
            ? messages.error(error)
            : messages.error
        loadingToast.update({
          ...(isPlainObject(errorMessage)
            ? ({ variant: "destructive", ...errorMessage } as ToasterToast)
            : {
                title: errorMessage,
                variant: "destructive" as ToastProps["variant"],
              }),
          id: loadingToast.id,
          open: true,
        })
        addToRemoveQueue(loadingToast.id)
        throw error
      }
    },
  }
)

type ExtendedToast = typeof toast & {
  success: (
    titleOrOptions: React.ReactNode | SuccessErrorOptions,
    options?: SuccessErrorOptions
  ) => ReturnType<typeof baseToast>
  error: (
    titleOrOptions: React.ReactNode | SuccessErrorOptions,
    options?: SuccessErrorOptions
  ) => ReturnType<typeof baseToast>
  info: (
    titleOrOptions: React.ReactNode | SuccessErrorOptions,
    options?: SuccessErrorOptions
  ) => ReturnType<typeof baseToast>
  warning: (
    titleOrOptions: React.ReactNode | SuccessErrorOptions,
    options?: SuccessErrorOptions
  ) => ReturnType<typeof baseToast>
  promise: <T>(
    promise: Promise<T>,
    messages: PromiseMessages<T>
  ) => Promise<T>
}

const extendedToast = toast as ExtendedToast

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast: extendedToast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, extendedToast as toast }
