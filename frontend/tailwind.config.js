/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  theme: {
  	extend: {
  		animation: {
  			'shimmer': 'shimmer 2s infinite linear',
  			'fade-in': 'fadeIn 0.3s ease-in-out',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'slide-down': 'slideDown 0.3s ease-in',
  		},
  		keyframes: {
  			shimmer: {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' },
  			},
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' },
  			},
  			slideUp: {
  				'0%': { transform: 'translateY(20px)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' },
  			},
  			slideDown: {
  				'0%': { transform: 'translateY(0)', opacity: '1' },
  				'100%': { transform: 'translateY(20px)', opacity: '0' },
  			},
  		},
  		fontFamily: {
  			'inter': ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  			'sans': ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  		},
  		fontSize: {
  			'hero': ['var(--font-size-hero)', { 
  				lineHeight: 'var(--line-height-tight)', 
  				letterSpacing: 'var(--letter-spacing-tight)',
  				fontWeight: 'var(--font-weight-extrabold)'
  			}],
  			'title': ['var(--font-size-title)', { 
  				lineHeight: 'var(--line-height-snug)', 
  				letterSpacing: 'var(--letter-spacing-tight)',
  				fontWeight: 'var(--font-weight-bold)'
  			}],
  			'section': ['var(--font-size-section)', { 
  				lineHeight: 'var(--line-height-compact)', 
  				letterSpacing: 'var(--letter-spacing-tight)',
  				fontWeight: 'var(--font-weight-bold)'
  			}],
  			'card-title': ['var(--font-size-card)', { 
  				lineHeight: 'var(--line-height-compact)', 
  				letterSpacing: 'var(--letter-spacing-normal)',
  				fontWeight: 'var(--font-weight-semibold)'
  			}],
  			'body': ['var(--font-size-body)', { 
  				lineHeight: 'var(--line-height-relaxed)', 
  				letterSpacing: 'var(--letter-spacing-normal)',
  				fontWeight: 'var(--font-weight-normal)'
  			}],
  			'small': ['var(--font-size-small)', { 
  				lineHeight: 'var(--line-height-relaxed)', 
  				letterSpacing: 'var(--letter-spacing-wide)',
  				fontWeight: 'var(--font-weight-normal)'
  			}],
  			'tiny': ['var(--font-size-tiny)', { 
  				lineHeight: 'var(--line-height-compact)', 
  				letterSpacing: 'var(--letter-spacing-wide)',
  				fontWeight: 'var(--font-weight-medium)'
  			}],
  		},
  		fontWeight: {
  			'normal': 'var(--font-weight-normal)',
  			'medium': 'var(--font-weight-medium)',
  			'semibold': 'var(--font-weight-semibold)',
  			'bold': 'var(--font-weight-bold)',
  			'extrabold': 'var(--font-weight-extrabold)',
  		},
  		letterSpacing: {
  			'tight': 'var(--letter-spacing-tight)',
  			'normal': 'var(--letter-spacing-normal)',
  			'wide': 'var(--letter-spacing-wide)',
  		},
  		lineHeight: {
  			'tight': 'var(--line-height-tight)',
  			'snug': 'var(--line-height-snug)',
  			'compact': 'var(--line-height-compact)',
  			'relaxed': 'var(--line-height-relaxed)',
  			'loose': 'var(--line-height-loose)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}