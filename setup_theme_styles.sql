-- Configuración de estilos y temas predeterminados para la plataforma de juegos
-- Este script inicializa los estilos CSS predeterminados para todas las organizaciones

-- 1. CSS personalizado por defecto para todas las organizaciones nuevas
CREATE OR REPLACE FUNCTION get_default_game_platform_css()
RETURNS TEXT AS $$
BEGIN
  RETURN '
/* Estilos de la plataforma de juegos */
:root {
  /* Colores primarios con diferentes intensidades */
  --game-primary-light: hsl(var(--primary) / 0.8);
  --game-primary-dark: hsl(var(--primary) / 1.2);
  
  /* Colores para juegos */
  --game-win: #4CAF50;
  --game-lose: #F44336;
  --game-draw: #FFC107;
  
  /* Colores para rankings */
  --rank-gold: #FFD700;
  --rank-silver: #C0C0C0;
  --rank-bronze: #CD7F32;
  
  /* Efectos para tarjetas de juegos */
  --game-card-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  --game-card-hover-transform: translateY(-5px);
  
  /* Animaciones */
  --game-transition-speed: 0.3s;
}

/* Estilos para las tarjetas de juegos */
.game-card {
  transition: transform var(--game-transition-speed), box-shadow var(--game-transition-speed);
  box-shadow: var(--game-card-shadow);
  border-radius: 12px;
  overflow: hidden;
}

.game-card:hover {
  transform: var(--game-card-hover-transform);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
}

/* Estilos para botones de juego */
.game-button {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-weight: bold;
  border-radius: 8px;
  transition: background var(--game-transition-speed);
}

.game-button:hover {
  background: var(--game-primary-dark);
}

/* Estilos para tablas de clasificación */
.leaderboard-table th {
  background-color: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
}

.leaderboard-table tr:nth-child(1) td:first-child {
  color: var(--rank-gold);
  font-weight: bold;
}

.leaderboard-table tr:nth-child(2) td:first-child {
  color: var(--rank-silver);
  font-weight: bold;
}

.leaderboard-table tr:nth-child(3) td:first-child {
  color: var(--rank-bronze);
  font-weight: bold;
}

/* Animaciones para puntuaciones */
@keyframes score-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.score-change {
  animation: score-pulse 0.5s ease-in-out;
}

/* Estilos para insignias y logros */
.achievement-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(45deg, hsl(var(--primary)), var(--game-primary-dark));
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 8px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
}

/* Estilos para notificaciones de juego */
.game-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(100px);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  z-index: 1000;
}

.game-notification.show {
  transform: translateY(0);
  opacity: 1;
}
';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. JavaScript personalizado por defecto para todas las organizaciones nuevas
CREATE OR REPLACE FUNCTION get_default_game_platform_js()
RETURNS TEXT AS $$
BEGIN
  RETURN '
// Funcionalidad básica para la plataforma de juegos
document.addEventListener("DOMContentLoaded", function() {
  // Inicialización del sistema de notificaciones
  setupGameNotifications();
  
  // Animaciones para las tarjetas de juegos
  setupGameCardAnimations();
});

// Sistema de notificaciones para juegos
function setupGameNotifications() {
  window.showGameNotification = function(message, type = "info") {
    // Crear el elemento de notificación
    const notification = document.createElement("div");
    notification.className = `game-notification ${type}`;
    notification.textContent = message;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  };
}

// Animaciones para tarjetas de juegos
function setupGameCardAnimations() {
  const gameCards = document.querySelectorAll(".game-card");
  
  gameCards.forEach(card => {
    card.addEventListener("mouseenter", function() {
      this.style.transform = "translateY(-5px)";
      this.style.boxShadow = "0 12px 20px rgba(0, 0, 0, 0.15)";
    });
    
    card.addEventListener("mouseleave", function() {
      this.style.transform = "translateY(0)";
      this.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
    });
  });
}

// Funciones de utilidad para la plataforma de juegos
const GamePlatform = {
  // Mostrar mensaje de victoria
  showWin: function(message) {
    showGameNotification(message || "¡Has ganado!", "win");
  },
  
  // Mostrar mensaje de derrota
  showLose: function(message) {
    showGameNotification(message || "Has perdido", "lose");
  },
  
  // Animar un cambio de puntuación
  animateScore: function(element) {
    if (element) {
      element.classList.add("score-change");
      setTimeout(() => {
        element.classList.remove("score-change");
      }, 500);
    }
  }
};
';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Actualizar todas las organizaciones existentes sin CSS personalizado
UPDATE public.organization_settings
SET custom_css = get_default_game_platform_css()
WHERE custom_css IS NULL OR custom_css = '';

-- 4. Actualizar todas las organizaciones existentes sin JS personalizado
UPDATE public.organization_settings
SET custom_js = get_default_game_platform_js()
WHERE custom_js IS NULL OR custom_js = '';

-- 5. Modificar la función para crear configuraciones por defecto para una organización
CREATE OR REPLACE FUNCTION public.create_default_organization_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_settings (
    organization_id, theme_primary_color, theme_mode, site_name, default_language,
    enable_registration, enable_public_site, custom_css, custom_js, created_at, updated_at
  ) VALUES (
    NEW.id, '#0099ff', 'light', NEW.name, 'ar',
    true, true, 
    get_default_game_platform_css(),
    get_default_game_platform_js(),
    NOW(), NOW()
  )
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 