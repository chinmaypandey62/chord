import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import styles from './HeroAnimation.css'

const HeroAnimation = ({
  animationPath = '/animations/chord-hero.json',
  loop = true,
  autoplay = true,
  className = ''
}) => {
  const containerRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -100px 0px' }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let anim
    if (shouldLoad && containerRef.current) {
      import('lottie-web').then((lottie) => {
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay,
          path: animationPath
        })
      })
    }
    return () => anim && anim.destroy()
  }, [shouldLoad, animationPath, loop, autoplay])

  return (
    <>
      <div
        ref={containerRef}
        className={`${className} mx-auto w-4/5 max-w-[500px] sm:max-w-[300px] ${styles.glow}`}
      />
      <noscript>
        <img
          src="/animations/chord-hero-fallback.png"
          alt="Chord hero animation"
          className="mx-auto w-4/5 max-w-[500px] sm:max-w-[300px]"
        />
      </noscript>
    </>
  )
}

HeroAnimation.propTypes = {
  animationPath: PropTypes.string,
  loop: PropTypes.bool,
  autoplay: PropTypes.bool,
  className: PropTypes.string
}

export default HeroAnimation
