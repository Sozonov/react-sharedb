// ref: https://github.com/mobxjs/mobx-react-lite/blob/master/src/observer.ts
import * as React from 'react'
import { observe, unobserve } from '@nx-js/observer-util'
import batching from '../batching'
import destroyer from './destroyer'

function NullComponent () {
  return null
}

export function observer (baseComponent) {
  const baseComponentName = baseComponent.displayName || baseComponent.name
  // memo; we are not intested in deep updates
  // in props; we assume that if deep objects are changed,
  // this is in observables, which would have been tracked anyway

  const memoComponent = React.memo(props => {
    // forceUpdate 2.0
    const forceUpdate = useForceUpdate()

    // wrap the baseComponent into an observe decorator once.
    // This way it will track any observable changes and will trigger rerender
    const observedComponent = React.useMemo(() => {
      let blockUpdate = { value: false }
      let update = () => {
        // TODO: Decide whether the check for unmount is needed here
        // Force update unless update is blocked. It's important to block
        // updates caused by rendering
        // (when the sync rendening is in progress)
        if (!blockUpdate.value) forceUpdate()
      }
      let batchedUpdate = () => batching.add(update)
      return observe(wrapBaseComponent(baseComponent, blockUpdate), {
        scheduler: batchedUpdate,
        lazy: true
      })
    }, [])

    // clean up observer on unmount
    useUnmount(() => unobserve(observedComponent))

    return observedComponent(props)
  })
  memoComponent.displayName = baseComponentName
  if (baseComponent.propTypes) {
    memoComponent.propTypes = baseComponent.propTypes
  }
  const suspenseWrapper = props =>
    React.createElement(
      React.Suspense,
      { fallback: React.createElement(NullComponent, null, null) },
      React.createElement(memoComponent, props)
    )
  suspenseWrapper.displayName = baseComponentName
  return suspenseWrapper
}

function wrapBaseComponent (baseComponent, blockUpdate) {
  return (...args) => {
    blockUpdate.value = true
    let res
    try {
      destroyer.reset()
      res = baseComponent(...args)
    } catch (err) {
      if (!err.then) throw err
      let promise = err
      let destroy = destroyer.getDestructor()
      destroy()
      throw promise.then(() => {
        return new Promise(resolve => {
          resolve()
        })
      })
    }
    blockUpdate.value = false
    return res
  }
}

function useForceUpdate () {
  const [, setTick] = React.useState()
  return () => {
    setTick(Math.random())
  }
}

// TODO: Might change to just `useEffect` in future. Don't know which one fits here better yet.
function useUnmount (fn) {
  React.useLayoutEffect(() => fn, [])
}
