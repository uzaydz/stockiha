import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '475px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					lighter: 'hsl(var(--primary-lighter))',
					darker: 'hsl(var(--primary-darker))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Game shop specific colors
				"game-purple": {
					50: "#f0eefa",
					100: "#d6bcfa",
					200: "#b794f4",
					300: "#9b87f5",
					400: "#7e69ab",
					500: "#6e59a5",
					600: "#553c9a",
					700: "#44337a",
					800: "#322659",
					900: "#1A1F2C"
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			transitionDuration: {
				'theme': 'var(--theme-transition-duration)',
			},
			transitionTimingFunction: {
				'theme': 'var(--theme-transition-timing)',
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce-soft': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				// Custom animations for CTA button
				'ripple': {
					'0%': { 
						transform: 'translate(-50%, -50%) scale(0)',
						opacity: '0.6'
					},
					'100%': { 
						transform: 'translate(-50%, -50%) scale(1)',
						opacity: '0'
					}
				},
				'shake': {
					'0%, 100%': { transform: 'translateX(0)' },
					'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
					'20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
				},
				'glow': {
					'0%, 100%': { 
						boxShadow: '0 0 5px rgba(255, 255, 255, 0.5), 0 0 10px rgba(255, 255, 255, 0.3)'
					},
					'50%': { 
						boxShadow: '0 0 15px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5)'
					}
				},
				'shine': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'pulse-border': {
					'0%, 100%': { 
						boxShadow: '0 0 0 0 rgba(var(--primary-rgb), 0.4)'
					},
					'50%': { 
						boxShadow: '0 0 0 5px rgba(var(--primary-rgb), 0)'
					}
				},
				'wiggle': {
					'0%, 100%': { transform: 'rotate(-3deg)' },
					'50%': { transform: 'rotate(3deg)' }
				},
				'spin-slow': {
					'from': { transform: 'rotate(0deg)' },
					'to': { transform: 'rotate(360deg)' }
				},
				'breathe': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.05)' }
				},
				'moving-gradient': {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' }
				},
				'rotate-border': {
					'0%': { backgroundPosition: '0% center' },
					'100%': { backgroundPosition: '200% center' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				// Custom animations for CTA button
				'ripple': 'ripple 0.6s linear forwards',
				'shake': 'shake 0.8s cubic-bezier(.36,.07,.19,.97) both',
				'glow': 'glow 1.5s ease-in-out infinite',
				'pulse-border': 'pulse-border 1.5s infinite',
				'wiggle': 'wiggle 0.5s ease-in-out infinite',
				'spin-slow': 'spin-slow 3s linear infinite',
				'breathe': 'breathe 4s infinite ease-in-out',
				'moving-gradient': 'moving-gradient 4s ease infinite',
				'rotate-border': 'rotate-border 4s linear infinite'
			},
			fontFamily: {
				'sans': ['Tajawal', 'sans-serif'],
				'tajawal': ['Tajawal', 'sans-serif'],
			},
			backdropBlur: {
				'theme': 'var(--backdrop-blur)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
