// Physics Flashcards Database
// Comprehensive physics content from K-12 to PhD level

const PHYSICS_DATA = {
  // Education levels with their topics
  levels: {
    elementary: {
      name: "Elementary (K-5)",
      categories: {
        "Basic Forces": {
          icon: "⚡",
          topics: {
            "Push and Pull": {
              cards: [
                {
                  id: "elem_force_1",
                  type: "Concept",
                  question: "What happens when you push a ball?",
                  answer: "The ball moves away from you",
                  explanation: "A push is a force that moves objects away from you. When you apply force to a ball by pushing it, the ball moves in the direction of the push.",
                  hint: "Think about what direction the ball goes when you push it",
                  difficulty: 1
                },
                {
                  id: "elem_force_2",
                  type: "Concept",
                  question: "What happens when you pull a wagon?",
                  answer: "The wagon moves toward you",
                  explanation: "A pull is a force that brings objects closer to you. When you pull a wagon, it follows you in your direction.",
                  hint: "Think about the direction the wagon moves when you pull the handle",
                  difficulty: 1
                }
              ]
            },
            "Gravity": {
              cards: [
                {
                  id: "elem_gravity_1",
                  type: "Concept",
                  question: "What makes things fall down instead of up?",
                  answer: "Gravity",
                  explanation: "Gravity is a force that pulls everything toward the Earth. That's why when you drop something, it falls down to the ground instead of floating up to the ceiling.",
                  hint: "Think about what happens when you drop a ball",
                  difficulty: 1
                }
              ]
            }
          }
        },
        "Light and Sound": {
          icon: "🌈",
          topics: {
            "Light Sources": {
              cards: [
                {
                  id: "elem_light_1",
                  type: "Concept",
                  question: "Name three things that make their own light",
                  answer: "The Sun, light bulbs, and fire",
                  explanation: "Some objects make their own light and are called light sources. The Sun is our biggest light source, light bulbs use electricity to make light, and fire creates light through burning.",
                  hint: "Think about what lights up your room at night",
                  difficulty: 1
                }
              ]
            }
          }
        }
      }
    },
    
    middle: {
      name: "Middle School (6-8)",
      categories: {
        "Motion and Forces": {
          icon: "🏃‍♂️",
          topics: {
            "Speed and Velocity": {
              cards: [
                {
                  id: "mid_motion_1",
                  type: "Concept",
                  question: "What is the difference between speed and velocity?",
                  answer: "Speed is how fast something moves; velocity includes direction",
                  explanation: "Speed only tells us how fast an object is moving (like 30 mph). Velocity tells us both how fast AND in what direction (like 30 mph north). Velocity is speed with direction.",
                  hint: "Think about whether direction matters",
                  difficulty: 2
                },
                {
                  id: "mid_motion_2",
                  type: "Calculation",
                  question: "If a car travels 120 miles in 2 hours, what is its speed?",
                  answer: "60 mph",
                  explanation: "Speed = Distance ÷ Time. So 120 miles ÷ 2 hours = 60 miles per hour.",
                  formula: "Speed = Distance ÷ Time",
                  hint: "Use the formula: Speed = Distance ÷ Time",
                  difficulty: 2
                }
              ]
            },
            "Newton's Laws": {
              cards: [
                {
                  id: "mid_newton_1",
                  type: "Concept",
                  question: "What is Newton's First Law of Motion?",
                  answer: "An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by a force",
                  explanation: "This is also called the Law of Inertia. It means objects don't change their motion unless something pushes or pulls them. A ball won't start rolling by itself, and a rolling ball won't stop unless friction or another force stops it.",
                  hint: "Think about what happens to objects when no force acts on them",
                  difficulty: 2
                }
              ]
            }
          }
        },
        "Energy": {
          icon: "⚡",
          topics: {
            "Types of Energy": {
              cards: [
                {
                  id: "mid_energy_1",
                  type: "Concept",
                  question: "What are the two main types of energy?",
                  answer: "Kinetic energy and potential energy",
                  explanation: "Kinetic energy is the energy of motion - anything that's moving has kinetic energy. Potential energy is stored energy - like a ball held up high or a stretched rubber band.",
                  hint: "One is about moving, one is about storing",
                  difficulty: 2
                }
              ]
            }
          }
        }
      }
    },
    
    high: {
      name: "High School (9-12)",
      categories: {
        "Mechanics": {
          icon: "⚙️",
          topics: {
            "Kinematics": {
              cards: [
                {
                  id: "high_kin_1",
                  type: "Concept",
                  question: "What is acceleration?",
                  answer: "The rate of change of velocity with respect to time",
                  explanation: "Acceleration measures how quickly velocity changes. It can be speeding up, slowing down, or changing direction. It's measured in m/s² (meters per second squared).",
                  formula: "a = Δv/Δt = (v_f - v_i)/t",
                  hint: "Think about how velocity changes over time",
                  difficulty: 3
                },
                {
                  id: "high_kin_2",
                  type: "Calculation",
                  question: "A car accelerates from 0 to 60 mph in 8 seconds. What is its acceleration in m/s²?",
                  answer: "3.36 m/s²",
                  explanation: "First convert 60 mph to m/s: 60 mph = 26.8 m/s. Then use a = Δv/Δt = (26.8 - 0)/8 = 3.36 m/s²",
                  formula: "a = (v_f - v_i)/t",
                  hint: "Remember to convert units first",
                  difficulty: 3
                }
              ]
            },
            "Forces and Newton's Laws": {
              cards: [
                {
                  id: "high_force_1",
                  type: "Concept",
                  question: "State Newton's Second Law of Motion",
                  answer: "F = ma (Force equals mass times acceleration)",
                  explanation: "The net force acting on an object is equal to the mass of the object multiplied by its acceleration. This means heavier objects need more force to accelerate them the same amount.",
                  formula: "F = ma",
                  hint: "This law relates force, mass, and acceleration",
                  difficulty: 3
                }
              ]
            }
          }
        },
        "Thermodynamics": {
          icon: "🌡️",
          topics: {
            "Heat and Temperature": {
              cards: [
                {
                  id: "high_thermo_1",
                  type: "Concept",
                  question: "What is the difference between heat and temperature?",
                  answer: "Temperature measures average kinetic energy of particles; heat is energy transfer",
                  explanation: "Temperature is a measure of how fast particles are moving on average. Heat is the energy that flows from hot objects to cold objects. You can have a small amount of very hot material (high temperature, low heat) or a large amount of warm material (moderate temperature, high heat).",
                  hint: "One is about particle motion, one is about energy transfer",
                  difficulty: 3
                }
              ]
            }
          }
        },
        "Waves and Sound": {
          icon: "🌊",
          topics: {
            "Wave Properties": {
              cards: [
                {
                  id: "high_wave_1",
                  type: "Concept",
                  question: "What is the relationship between wavelength, frequency, and wave speed?",
                  answer: "v = fλ (wave speed = frequency × wavelength)",
                  explanation: "Wave speed equals frequency times wavelength. If frequency increases, wavelength decreases (and vice versa) to maintain constant speed in the same medium.",
                  formula: "v = fλ",
                  hint: "Think about how these three properties are connected",
                  difficulty: 3
                }
              ]
            }
          }
        },
        "Electricity and Magnetism": {
          icon: "⚡",
          topics: {
            "Electric Circuits": {
              cards: [
                {
                  id: "high_elec_1",
                  type: "Concept",
                  question: "What is Ohm's Law?",
                  answer: "V = IR (Voltage = Current × Resistance)",
                  explanation: "Ohm's Law states that the voltage across a conductor is directly proportional to the current flowing through it, with resistance as the constant of proportionality.",
                  formula: "V = IR",
                  hint: "This law relates voltage, current, and resistance",
                  difficulty: 3
                }
              ]
            }
          }
        }
      }
    },
    
    undergraduate: {
      name: "Undergraduate",
      categories: {
        "Classical Mechanics": {
          icon: "🎯",
          topics: {
            "Lagrangian Mechanics": {
              cards: [
                {
                  id: "under_lag_1",
                  type: "Concept",
                  question: "What is the Lagrangian?",
                  answer: "L = T - V (Kinetic energy minus potential energy)",
                  explanation: "The Lagrangian is a function that describes the dynamics of a system. It's defined as the kinetic energy T minus the potential energy V. The principle of least action uses the Lagrangian to derive equations of motion.",
                  formula: "L = T - V",
                  hint: "It's the difference between two types of energy",
                  difficulty: 4
                }
              ]
            },
            "Hamiltonian Mechanics": {
              cards: [
                {
                  id: "under_ham_1",
                  type: "Concept",
                  question: "What is the Hamiltonian?",
                  answer: "H = T + V (Total energy of the system)",
                  explanation: "The Hamiltonian represents the total energy of a system, equal to kinetic plus potential energy. In Hamiltonian mechanics, it's expressed in terms of generalized coordinates and momenta.",
                  formula: "H = T + V = Σ(p_i * q̇_i) - L",
                  hint: "It represents the total energy",
                  difficulty: 4
                }
              ]
            }
          }
        },
        "Electromagnetism": {
          icon: "🧲",
          topics: {
            "Maxwell's Equations": {
              cards: [
                {
                  id: "under_max_1",
                  type: "Concept",
                  question: "What does Gauss's Law state?",
                  answer: "The electric flux through a closed surface is proportional to the enclosed charge",
                  explanation: "Gauss's Law is one of Maxwell's equations. It states that ∇·E = ρ/ε₀, meaning the divergence of the electric field equals the charge density divided by the permittivity of free space.",
                  formula: "∇·E = ρ/ε₀",
                  hint: "It relates electric field to charge distribution",
                  difficulty: 4
                }
              ]
            }
          }
        },
        "Quantum Mechanics": {
          icon: "🔬",
          topics: {
            "Wave-Particle Duality": {
              cards: [
                {
                  id: "under_quantum_1",
                  type: "Concept",
                  question: "What is the de Broglie wavelength?",
                  answer: "λ = h/p (Planck's constant divided by momentum)",
                  explanation: "The de Broglie wavelength describes the wave nature of matter. Every particle has an associated wavelength inversely proportional to its momentum. This is fundamental to quantum mechanics.",
                  formula: "λ = h/p",
                  hint: "It relates wave properties to particle properties",
                  difficulty: 4
                }
              ]
            }
          }
        }
      }
    },
    
    graduate: {
      name: "Graduate",
      categories: {
        "Advanced Quantum Mechanics": {
          icon: "⚛️",
          topics: {
            "Schrödinger Equation": {
              cards: [
                {
                  id: "grad_schrod_1",
                  type: "Concept",
                  question: "What is the time-dependent Schrödinger equation?",
                  answer: "iℏ ∂ψ/∂t = Ĥψ",
                  explanation: "The time-dependent Schrödinger equation describes how quantum states evolve over time. Ĥ is the Hamiltonian operator, ψ is the wave function, and ℏ is the reduced Planck constant.",
                  formula: "iℏ ∂ψ/∂t = Ĥψ",
                  hint: "It describes quantum evolution in time",
                  difficulty: 5
                }
              ]
            }
          }
        },
        "Statistical Mechanics": {
          icon: "📊",
          topics: {
            "Partition Functions": {
              cards: [
                {
                  id: "grad_stat_1",
                  type: "Concept",
                  question: "What is the canonical partition function?",
                  answer: "Z = Σ e^(-E_i/kT)",
                  explanation: "The canonical partition function is the sum over all possible states of the Boltzmann factor e^(-E_i/kT). It's fundamental to statistical mechanics and connects microscopic properties to macroscopic thermodynamics.",
                  formula: "Z = Σ e^(-E_i/kT)",
                  hint: "It sums over all possible energy states",
                  difficulty: 5
                }
              ]
            }
          }
        }
      }
    },
    
    phd: {
      name: "PhD Level",
      categories: {
        "Quantum Field Theory": {
          icon: "🌌",
          topics: {
            "Field Quantization": {
              cards: [
                {
                  id: "phd_qft_1",
                  type: "Concept",
                  question: "What is the Klein-Gordon equation?",
                  answer: "(□ + m²)φ = 0, where □ is the d'Alembertian operator",
                  explanation: "The Klein-Gordon equation describes relativistic scalar fields. It's the quantum field theory generalization of the Schrödinger equation for relativistic particles with spin 0.",
                  formula: "(∂²/∂t² - ∇² + m²)φ = 0",
                  hint: "It's the relativistic wave equation for scalar fields",
                  difficulty: 6
                }
              ]
            }
          }
        },
        "General Relativity": {
          icon: "🕳️",
          topics: {
            "Einstein Field Equations": {
              cards: [
                {
                  id: "phd_gr_1",
                  type: "Concept",
                  question: "What are Einstein's field equations?",
                  answer: "G_μν = 8πT_μν (Einstein tensor equals stress-energy tensor)",
                  explanation: "Einstein's field equations relate the curvature of spacetime (G_μν) to the energy and matter content (T_μν). They form the foundation of general relativity.",
                  formula: "G_μν = 8πT_μν",
                  hint: "They relate spacetime curvature to energy-momentum",
                  difficulty: 6
                }
              ]
            }
          }
        }
      }
    }
  }
};

// Spaced repetition intervals (in days)
const SRS_INTERVALS = {
  1: [1, 3, 7, 14, 30, 90, 180, 365], // Hard
  2: [1, 4, 10, 25, 60, 150, 365],    // Good  
  3: [1, 6, 18, 45, 120, 365]         // Easy
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PHYSICS_DATA, SRS_INTERVALS };
}