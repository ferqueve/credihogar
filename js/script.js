// Detectar tipo de tienda
const storeType = window.storeType || 'kids';

// Prefijo para claves de localStorage
const PREFIX = storeType === 'hogar' ? 'hogar_' : 'pksKids_';

// Claves para localStorage
const STORAGE_KEY_PRODUCTS = PREFIX + 'Productos';
const STORAGE_KEY_CART = PREFIX + 'Carrito';
const STORAGE_KEY_LAST_ID = PREFIX + 'LastId';
const STORAGE_KEY_WHATSAPP = PREFIX + 'Whatsapp';
const STORAGE_KEY_SALES = PREFIX + 'Ventas';
const STORAGE_KEY_STORE_CONFIG = PREFIX + 'ConfigTienda';
const STORAGE_KEY_CLIENTS = PREFIX + 'Clientes';
const STORAGE_KEY_PAYMENTS = PREFIX + 'Pagos';

// Credenciales de admin
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// Configuración por defecto según tienda
function getDefaultStoreConfig() {
    return storeType === 'hogar' ? {
        name: "CrediHogar",
        logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyMDAgODAiPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iODAiIGZpbGw9IiMyYzNlNTAiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjQ1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IldoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DcmVkaUhvZ2FyPC90ZXh0Pgo8L3N2Zz4="
    } : {
        name: "PKS Kids",
        logo: "img/logo.png"
    };
}

// Obtener configuración de tienda
function getStoreConfig() {
    const saved = localStorage.getItem(STORAGE_KEY_STORE_CONFIG);
    if (saved) {
        return JSON.parse(saved);
    } else {
        const defaultConfig = getDefaultStoreConfig();
        localStorage.setItem(STORAGE_KEY_STORE_CONFIG, JSON.stringify(defaultConfig));
        return defaultConfig;
    }
}

// Guardar configuración de tienda
function saveStoreConfig(config) {
    localStorage.setItem(STORAGE_KEY_STORE_CONFIG, JSON.stringify(config));
    updateStoreUI();
}

// Obtener clientes
function getClients() {
    const saved = localStorage.getItem(STORAGE_KEY_CLIENTS);
    return saved ? JSON.parse(saved) : [];
}

// Guardar clientes
function saveClients(clients) {
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients));
}

// Obtener historial de ventas
function getSalesHistory() {
    const saved = localStorage.getItem(STORAGE_KEY_SALES);
    return saved ? JSON.parse(saved) : [];
}

// Guardar historial de ventas
function saveSalesHistory(sales) {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
}

// Obtener pagos
function getPayments() {
    const saved = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    return saved ? JSON.parse(saved) : [];
}

// Guardar pagos
function savePayments(payments) {
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
}

// Registrar un pago
function registerPayment(saleId, clientId, amount, installmentNumber) {
    const payments = getPayments();
    payments.push({
        id: Date.now(),
        saleId,
        clientId,
        amount,
        installmentNumber,
        date: new Date().toISOString()
    });
    savePayments(payments);
}

// Calcular estado de cuenta de un cliente
function getClientAccount(clientId) {
    const sales = getSalesHistory().filter(sale => 
        sale.customer.id === clientId && sale.installments
    );
    
    const payments = getPayments().filter(payment => payment.clientId === clientId);
    
    const account = sales.map(sale => {
        const total = sale.total;
        const installments = sale.maxInstallments || 1;
        const installmentAmount = total / installments;
        
        const paidInstallments = payments
            .filter(p => p.saleId === sale.id)
            .reduce((sum, p) => sum + 1, 0);
            
        const dueInstallments = [];
        for (let i = 1; i <= installments; i++) {
            const paid = payments.some(p => p.saleId === sale.id && p.installmentNumber === i);
            const dueDate = new Date(sale.date);
            dueDate.setMonth(dueDate.getMonth() + i - 1);
            
            dueInstallments.push({
                number: i,
                amount: installmentAmount,
                paid,
                dueDate: dueDate.toISOString().split('T')[0],
                overdue: !paid && new Date(dueDate) < new Date()
            });
        }
        
        return {
            saleId: sale.id,
            date: sale.date,
            total,
            installments,
            installmentAmount,
            paidInstallments,
            dueInstallments,
            completed: paidInstallments >= installments
        };
    });
    
    return account;
}

// Ver cuenta del cliente
function viewClientAccount(clientId) {
    const client = getClients().find(c => c.id === clientId);
    if (!client) return;
    
    const account = getClientAccount(clientId);
    let html = `<h5>Cuenta de: ${client.name} (Cédula: ${client.id})</h5>`;
    
    if (account.length === 0) {
        html += `<div class="alert alert-info">No tiene compras en cuotas.</div>`;
    } else {
        account.forEach(sale => {
            html += `
                <div class="card mb-3">
                    <div class="card-header">
                        Venta #${sale.saleId} - ${new Date(sale.date).toLocaleString()}
                        <span class="badge ${sale.completed ? 'bg-success' : 'bg-warning'} ms-2">
                            ${sale.completed ? 'Completada' : 'En curso'}
                        </span>
                    </div>
                    <div class="card-body">
                        <p>Total: $${sale.total.toFixed(2)} en ${sale.installments} cuotas de $${sale.installmentAmount.toFixed(2)}</p>
                        <div class="row">
                            ${sale.dueInstallments.map(inst => `
                                <div class="col-md-4 mb-2">
                                    <div class="card ${inst.overdue ? 'border-danger' : inst.paid ? 'border-success' : 'border-warning'}">
                                        <div class="card-body p-2 text-center">
                                            <small>Cuota ${inst.number}</small><br>
                                            <strong>$${inst.amount.toFixed(2)}</strong><br>
                                            <small>Vence: ${inst.dueDate}</small><br>
                                            ${inst.paid ? 
                                                '<span class="badge bg-success">Pagada</span>' : 
                                                inst.overdue ? 
                                                    '<span class="badge bg-danger">Vencida</span>' : 
                                                    '<span class="badge bg-warning">Pendiente</span>'
                                            }
                                            ${!inst.paid ? `
                                                <br><button class="btn btn-sm btn-success mt-1 pay-installment-btn" 
                                                    data-sale-id="${sale.saleId}" 
                                                    data-client-id="${clientId}" 
                                                    data-amount="${inst.amount}" 
                                                    data-number="${inst.number}">
                                                    Registrar Pago
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    Swal.fire({
        title: 'Estado de Cuenta',
        html: html,
        width: '90%',
        didOpen: () => {
            document.querySelectorAll('.pay-installment-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const saleId = this.getAttribute('data-sale-id');
                    const clientId = this.getAttribute('data-client-id');
                    const amount = parseFloat(this.getAttribute('data-amount'));
                    const number = parseInt(this.getAttribute('data-number'));
                    
                    Swal.fire({
                        title: 'Confirmar Pago',
                        text: `¿Registrar pago de $${amount.toFixed(2)} para la cuota ${number}?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, registrar',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            registerPayment(saleId, clientId, amount, number);
                            
                            const account = getClientAccount(clientId);
                            const hasOverdue = account.some(sale => 
                                sale.dueInstallments.some(inst => inst.overdue)
                            );
                            
                            const clients = getClients();
                            const clientIndex = clients.findIndex(c => c.id === clientId);
                            if (clientIndex !== -1) {
                                clients[clientIndex].status = hasOverdue ? 'deudor' : 'al_dia';
                                saveClients(clients);
                            }
                            
                            viewClientAccount(clientId);
                            Swal.fire('✅ Pago registrado', '', 'success');
                        }
                    });
                });
            });
        }
    });
}

// Obtener productos
function getProducts() {
    const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (saved) {
        return JSON.parse(saved);
    } else {
        const initialProducts = storeType === 'hogar' ? [
            {
                id: 1,
                name: "Sofá 3 Plazas Tapizado",
                category: "muebles",
                price: 18990,
                image: "img/1.png",
                sold: false,
                discount: 0,
                description: "Sofá moderno de 3 plazas, tapizado en tela antimanchas. Incluye cojines decorativos.",
                maxInstallments: 12,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: "Juego de Comedor 6 Sillas",
                category: "muebles",
                price: 24500,
                image: "img/2.png",
                sold: false,
                discount: 0,
                description: "Mesa de comedor de madera maciza con 6 sillas tapizadas. Ideal para reuniones familiares.",
                maxInstallments: 12,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: "Heladera No Frost 300L",
                category: "electrodomesticos",
                price: 22990,
                image: "img/3.png",
                sold: false,
                discount: 0,
                description: "Heladera No Frost de 300 litros, con freezer superior y sistema de ahorro de energía.",
                maxInstallments: 12,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                name: "Lavarropas Automático 8kg",
                category: "electrodomesticos",
                price: 19990,
                image: "img/4.png",
                sold: false,
                discount: 0,
                description: "Lavarropas automático con capacidad de 8 kg, 15 programas de lavado y temporizador digital.",
                maxInstallments: 12,
                createdAt: new Date().toISOString()
            },
            {
                id: 5,
                name: "Juego de Ollas Acero Inoxidable",
                category: "cocina",
                price: 3490,
                image: "img/5.png",
                sold: false,
                discount: 0,
                description: "Juego de 5 ollas de acero inoxidable con tapas de vidrio. Aptas para todo tipo de cocinas.",
                maxInstallments: 6,
                createdAt: new Date().toISOString()
            },
            {
                id: 6,
                name: "Cafetera Express",
                category: "cocina",
                price: 4290,
                image: "img/6.png",
                sold: false,
                discount: 0,
                description: "Cafetera express con molinillo integrado, vaporizador de leche y sistema de autolimpieza.",
                maxInstallments: 6,
                createdAt: new Date().toISOString()
            },
            {
                id: 7,
                name: "Juego de Sábanas 2 Plazas",
                category: "textiles",
                price: 2890,
                image: "img/7.png",
                sold: false,
                discount: 0,
                description: "Juego de sábanas 100% algodón egipcio, 400 hilos. Incluye sábana ajustable, plana y 2 fundas.",
                maxInstallments: 6,
                createdAt: new Date().toISOString()
            },
            {
                id: 8,
                name: "Cortinas Blackout 2.50m",
                category: "textiles",
                price: 1990,
                image: "img/8.png",
                sold: false,
                discount: 0,
                description: "Cortinas blackout de 2.50 metros de alto, bloquean el 99% de la luz. Incluyen rieles.",
                maxInstallments: 3,
                createdAt: new Date().toISOString()
            },
            {
                id: 9,
                name: "Lámpara de Techo LED",
                category: "decoracion",
                price: 2490,
                image: "img/9.png",
                sold: false,
                discount: 0,
                description: "Lámpara de techo LED regulable, 3 modos de color (cálido, neutro, frío). Ahorro de energía.",
                maxInstallments: 6,
                createdAt: new Date().toISOString()
            },
            {
                id: 10,
                name: "Espejo Decorativo 80x120cm",
                category: "decoracion",
                price: 3290,
                image: "img/10.png",
                sold: false,
                discount: 0,
                description: "Espejo decorativo con marco de madera envejecida. Medidas: 80x120 cm. Fácil instalación.",
                maxInstallments: 6,
                createdAt: new Date().toISOString()
            }
        ] : [
            {
                id: 1,
                name: "Remera Dinosaurio",
                category: "remeras",
                price: 29.99,
                image: "img/1.png",
                sold: false,
                discount: 0,
                description: "Remera de algodón 100%.",
                maxInstallments: 0,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(initialProducts));
        localStorage.setItem(STORAGE_KEY_LAST_ID, '6');
        return initialProducts;
    }
}

// Guardar productos
function saveProducts(products) {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
}

// Obtener carrito
function getCart() {
    const saved = localStorage.getItem(STORAGE_KEY_CART);
    return saved ? JSON.parse(saved) : [];
}

// Guardar carrito
function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
}

// Obtener WhatsApp
function getWhatsappNumber() {
    return localStorage.getItem(STORAGE_KEY_WHATSAPP) || '+59895430818';
}

// Guardar WhatsApp
function saveWhatsappNumber(number) {
    localStorage.setItem(STORAGE_KEY_WHATSAPP, number);
}

// Variables globales
let products = getProducts();
let cart = getCart();

// Actualizar UI de tienda
function updateStoreUI() {
    const config = getStoreConfig();
    const brandName = document.querySelector('.brand-name');
    const logoImg = document.querySelector('.navbar-brand img');

    if (brandName) brandName.textContent = config.name;
    if (logoImg) logoImg.src = config.logo;
}

// Renderizar productos
function renderProducts(filteredProducts = products) {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (filteredProducts.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">No se encontraron productos.</div></div>`;
        return;
    }

    filteredProducts.forEach(product => {
        const discountPrice = product.price * (1 - product.discount / 100);
        const finalPrice = product.discount > 0 ? discountPrice : product.price;

        const inCart = cart.some(item => item.id === product.id);

        const card = document.createElement('div');
        card.className = 'col-md-4 col-sm-6';
        card.innerHTML = `
            <div class="card position-relative h-100">
                ${product.sold ? '<div class="sold-out-overlay">AGOTADO</div>' : ''}
                <img src="${product.image}" 
                     onerror="this.src='https://via.placeholder.com/300x300/e0e0e0/999999?text=Sin+Imagen'; this.style.opacity='0.7'"
                     class="card-img-top" 
                     alt="${product.name}" 
                     style="height: 250px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.name}</h5>
                    ${product.description ? `<p class="text-muted small">${product.description}</p>` : ''}
                    <p class="card-text">
                        <span class="badge bg-secondary">${product.category}</span>
                        ${product.discount > 0 ? `<span class="badge badge-offer">-${product.discount}%</span>` : ''}
                        ${product.maxInstallments > 0 ? `<br><small class="text-success">✅ Hasta ${product.maxInstallments} cuotas sin recargo</small>` : ''}
                    </p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            ${product.discount > 0 ? `<span class="price-original">$${product.price.toFixed(2)}</span>` : ''}
                            <strong>$${finalPrice.toFixed(2)}</strong>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-buy w-100 ${product.sold || inCart ? 'disabled' : ''}" 
                                data-id="${product.id}" ${product.sold || inCart ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i> ${inCart ? 'En carrito' : 'Agregar al carrito'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    document.querySelectorAll('.btn-buy:not(.disabled)').forEach(button => {
        button.addEventListener('click', addToCart);
    });

    updateCartCount();
}

// Agregar al carrito
function addToCart(event) {
    const productId = parseInt(event.target.getAttribute('data-id'));
    const product = products.find(p => p.id === productId);

    if (!product || product.sold) {
        Swal.fire('Oops', 'Producto no disponible.', 'error');
        return;
    }

    cart.push({...product});
    saveCart(cart);
    renderProducts();
    updateCartCount();
    Swal.fire('Agregado', `${product.name} añadido al carrito.`, 'success');
}

// Actualizar contador del carrito
function updateCartCount() {
    const count = document.getElementById('cartCount');
    if (count) count.textContent = cart.length;
}

// Renderizar carrito
function renderCart() {
    const container = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');
    if (!container || !totalElement) return;

    if (cart.length === 0) {
        container.innerHTML = `<p class="text-center">Tu carrito está vacío.</p>`;
        totalElement.textContent = '$0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        const finalPrice = item.price * (1 - item.discount / 100);
        total += finalPrice;

        return `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <div>
                    <strong>${item.name}</strong><br>
                    $${finalPrice.toFixed(2)} ${item.discount > 0 ? `<small class="text-muted">(antes $${item.price.toFixed(2)})</small>` : ''}
                    ${item.maxInstallments > 0 ? `<br><small class="text-success">Hasta ${item.maxInstallments} cuotas</small>` : ''}
                </div>
                <button class="btn btn-sm btn-danger" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    totalElement.textContent = `$${total.toFixed(2)}`;

    document.querySelectorAll('#cartItems .btn-danger').forEach(btn => {
        btn.addEventListener('click', removeFromCart);
    });
}

// Eliminar del carrito
function removeFromCart(event) {
    const index = parseInt(event.target.closest('.btn').getAttribute('data-index'));
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
    renderProducts();
    updateCartCount();
}

// Finalizar compra — ¡SIN %0A Y SIN DUPLICADOS!
function checkout() {
    if (cart.length === 0) {
        Swal.fire('Carrito vacío', 'Agrega productos antes de finalizar.', 'warning');
        return;
    }

    const productsUpdated = getProducts();
    const unavailable = cart.filter(item => {
        const current = productsUpdated.find(p => p.id === item.id);
        return current?.sold;
    });

    if (unavailable.length > 0) {
        Swal.fire('Productos no disponibles', 
            `Los siguientes productos ya fueron vendidos:\n${unavailable.map(p => `- ${p.name}`).join('\n')}`,
            'error'
        );
        cart = cart.filter(item => !unavailable.some(u => u.id === item.id));
        saveCart(cart);
        renderCart();
        renderProducts();
        updateCartCount();
        return;
    }

    const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
    if (cartModal) {
        cartModal.hide();
    }

    setTimeout(() => {
        const isHogar = storeType === 'hogar';
        let html = '';
        if (isHogar) {
            html = `
                <input id="swal-name" class="swal2-input" placeholder="Nombre completo">
                <input id="swal-address" class="swal2-input" placeholder="Dirección">
                <input id="swal-phone" class="swal2-input" placeholder="Teléfono">
                <input id="swal-city" class="swal2-input" placeholder="Ciudad">
                <input id="swal-id" class="swal2-input" placeholder="Cédula">
                <div class="mt-2">
                    <label class="form-check-label">
                        <input type="checkbox" id="swal-installments" class="form-check-input"> ¿Pagar en cuotas?
                    </label>
                </div>
            `;
        } else {
            html = `
                <input id="swal-name" class="swal2-input" placeholder="Nombre completo">
                <input id="swal-address" class="swal2-input" placeholder="Dirección de envío">
                <input id="swal-phone" class="swal2-input" placeholder="Teléfono (Ej: 099123456)">
            `;
        }

        Swal.fire({
            title: 'Finalizar Compra',
            html: html,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Enviar pedido por WhatsApp',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                const firstInput = document.getElementById('swal-name');
                if (firstInput) {
                    firstInput.focus();
                    setTimeout(() => firstInput.focus(), 100);
                }
            },
            preConfirm: () => {
                if (isHogar) {
                    const name = document.getElementById('swal-name').value;
                    const address = document.getElementById('swal-address').value;
                    const phone = document.getElementById('swal-phone').value;
                    const city = document.getElementById('swal-city').value;
                    const id = document.getElementById('swal-id').value;
                    const installments = document.getElementById('swal-installments').checked;

                    if (!name || !address || !phone || !id) {
                        Swal.showValidationMessage('Completa todos los campos');
                        return false;
                    }

                    const clients = getClients();
                    const client = clients.find(c => c.id === id);
                    if (client && client.status === 'deudor' && installments) {
                        Swal.showValidationMessage('⚠️ Este cliente tiene saldo deudor. No se recomienda vender en cuotas.');
                        return false;
                    }

                    return { name, address, phone, city, id, installments };
                } else {
                    const name = document.getElementById('swal-name').value;
                    const address = document.getElementById('swal-address').value;
                    const phone = document.getElementById('swal-phone').value;

                    if (!name || !address || !phone) {
                        Swal.showValidationMessage('Por favor completa todos los campos');
                        return false;
                    }

                    return { name, address, phone };
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const data = result.value;
                const isHogar = storeType === 'hogar';

                if (isHogar) {
                    let clients = getClients();
                    const existingClient = clients.find(c => c.id === data.id);
                    if (!existingClient) {
                        clients.push({
                            id: data.id,
                            name: data.name,
                            address: data.address,
                            phone: data.phone,
                            city: data.city,
                            status: 'al_dia',
                            createdAt: new Date().toISOString()
                        });
                        saveClients(clients);
                    }
                }

                let total = 0;
                const itemsList = cart.map(item => {
                    const finalPrice = item.price * (1 - item.discount / 100);
                    total += finalPrice;
                    if (isHogar && data.installments) {
                        const cuotas = Math.min(3, item.maxInstallments || 1);
                        return `• ${item.name} - $${finalPrice.toFixed(2)} (en ${cuotas} cuotas)`;
                    }
                    return `• ${item.name} - $${finalPrice.toFixed(2)}`;
                }).join('\n');

                const config = getStoreConfig();
                let message = '';
                if (isHogar) {
                    message = `Hola, quiero hacer un pedido en ${config.name}.

*DATOS DEL CLIENTE*
Nombre: ${data.name}
Cédula: ${data.id}
Dirección: ${data.address}
Ciudad: ${data.city}
Teléfono: ${data.phone}

*PRODUCTOS*
${itemsList}

*TOTAL: $${total.toFixed(2)}*
${data.installments ? '*PAGO EN CUOTAS*' : '*PAGO CONTADO*'}

¡Gracias!`;
                } else {
                    message = `Hola, quiero hacer un pedido en ${config.name}.

*DATOS DEL CLIENTE*
Nombre: ${data.name}
Dirección: ${data.address}
Teléfono: ${data.phone}

*PRODUCTOS SELECCIONADOS*
${itemsList}

*TOTAL A PAGAR: $${total.toFixed(2)}*

¡Gracias! Espero su confirmación para vestir con amor a mi peque 🧸`;
                }

                const whatsappNumber = getWhatsappNumber();
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

                if (isHogar) {
                    const maxInstallments = data.installments ? 
                        Math.min(3, Math.max(...cart.map(item => item.maxInstallments || 1))) : 0;

                    const sale = {
                        id: Date.now(),
                        date: new Date().toISOString(),
                        customer: { 
                            name: data.name, 
                            id: data.id, 
                            address: data.address, 
                            phone: data.phone, 
                            city: data.city 
                        },
                        items: cart.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            discount: item.discount,
                            maxInstallments: item.maxInstallments
                        })),
                        total: total,
                        installments: data.installments,
                        maxInstallments: maxInstallments
                    };

                    const salesHistory = getSalesHistory();
                    salesHistory.push(sale);
                    saveSalesHistory(salesHistory);

                    if (data.installments) {
                        const clients = getClients();
                        const clientIndex = clients.findIndex(c => c.id === data.id);
                        if (clientIndex !== -1) {
                            clients[clientIndex].status = 'deudor';
                            saveClients(clients);
                        }
                    }
                }

                cart.forEach(cartItem => {
                    const index = products.findIndex(p => p.id === cartItem.id);
                    if (index !== -1) {
                        products[index].sold = true;
                    }
                });

                saveProducts(products);
                cart = [];
                saveCart(cart);

                renderProducts();
                updateCartCount();

                window.open(whatsappUrl, '_blank');

                Swal.fire('¡Pedido enviado!', 'Hemos abierto WhatsApp para que confirmes tu pedido.', 'success');
            } else {
                setTimeout(() => {
                    const modal = new bootstrap.Modal(document.getElementById('cartModal'));
                    renderCart();
                    modal.show();
                }, 300);
            }
        });
    }, 300);
}

// Filtros
function filterProducts() {
    const category = document.getElementById('categoryFilter').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;

    const filtered = products.filter(product => {
        const finalPrice = product.price * (1 - product.discount / 100);
        return (
            (category === '' || product.category === category) &&
            finalPrice >= minPrice &&
            finalPrice <= maxPrice
        );
    });

    renderProducts(filtered);
}

// Restablecer filtros
document.getElementById('resetFilters')?.addEventListener('click', () => {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    Swal.fire({
        title: '🔐 ¿Quitar todos los descuentos?',
        text: 'Esta acción requiere contraseña de administrador.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, quitar descuentos',
        cancelButtonText: 'Cancelar',
        input: 'password',
        inputLabel: 'Contraseña',
        inputPlaceholder: 'Ingresa la contraseña',
        preConfirm: (password) => {
            if (password !== ADMIN_PASS) {
                Swal.showValidationMessage('❌ Contraseña incorrecta');
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            products = products.map(p => {
                if (!p.sold) p.discount = 0;
                return p;
            });
            saveProducts(products);
            renderProducts();
            Swal.fire('✅ Descuentos removidos', 'Todos los descuentos han sido eliminados.', 'success');
        }
    });
});

// Eventos de filtros
document.getElementById('categoryFilter')?.addEventListener('change', filterProducts);
document.getElementById('minPrice')?.addEventListener('input', filterProducts);
document.getElementById('maxPrice')?.addEventListener('input', filterProducts);

// Evento para abrir el carrito
document.getElementById('cartButton')?.addEventListener('click', (e) => {
    e.preventDefault();
    const modal = new bootstrap.Modal(document.getElementById('cartModal'));
    renderCart();
    modal.show();
});

// Evento para finalizar compra
document.getElementById('checkoutButton')?.addEventListener('click', checkout);

// ========================
// PANEL DE ADMINISTRACIÓN
// ========================

// Abrir modal de login
document.getElementById('adminLoginBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const loginModal = new bootstrap.Modal(document.getElementById('adminLoginModal'));
    loginModal.show();
});

// Login de admin
document.getElementById('adminLoginSubmit')?.addEventListener('click', () => {
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        bootstrap.Modal.getInstance(document.getElementById('adminLoginModal')).hide();
        const panelModal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
        renderAdminPanel();
        panelModal.show();
    } else {
        Swal.fire('Error', 'Usuario o contraseña incorrectos.', 'error');
    }
});

// Renderizar panel de admin
function renderAdminPanel() {
    renderAdminProducts();
    renderOldProducts();
    renderWhatsappSettings();
    renderSalesHistory();
    renderClients();
    renderStoreConfig();
    if (storeType === 'hogar') {
        renderAccountsOverview();
    }
}

// Renderizar productos en admin
function renderAdminProducts() {
    const container = document.getElementById('adminProductsList');
    if (!container) return;

    container.innerHTML = products.map(product => {
        const daysOld = Math.floor((new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24));
        return `
            <div class="col-md-4">
                <div class="card h-100">
                    <img src="${product.image}" 
                         onerror="this.src='https://via.placeholder.com/150x150/e0e0e0/999999?text=Sin+Imagen'; this.style.opacity='0.7'"
                         class="card-img-top" 
                         style="height: 150px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title">${product.name}</h6>
                        ${product.description ? `<p class="text-muted small">${product.description}</p>` : ''}
                        <p class="card-text">
                            <small class="text-muted">Categoría: ${product.category}</small><br>
                            <strong>$${product.price.toFixed(2)}</strong>
                            ${product.maxInstallments > 0 ? `<br><small class="text-success">Cuotas: ${product.maxInstallments}</small>` : ''}
                            ${product.discount > 0 ? `<span class="badge bg-warning">-${product.discount}%</span>` : ''}
                            ${product.sold ? `<span class="badge bg-danger">VENDIDO</span>` : ''}
                            <br>
                            <small>Días en stock: ${daysOld}</small>
                        </p>
                        <div class="d-grid gap-2">
                            ${!product.sold && product.discount === 0 ? `
                            <button class="btn btn-sm btn-warning admin-apply-discount" data-id="${product.id}">
                                <i class="fas fa-tag"></i> Aplicar 20% OFF
                            </button>` : ''}
                            ${!product.sold && product.discount > 0 ? `
                            <button class="btn btn-sm btn-outline-secondary admin-remove-discount" data-id="${product.id}">
                                <i class="fas fa-undo"></i> Quitar Descuento
                            </button>` : ''}
                            ${!product.sold ? `
                            <button class="btn btn-sm btn-outline-danger admin-delete-product" data-id="${product.id}">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.admin-apply-discount').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index].discount = 20;
                saveProducts(products);
                renderAdminPanel();
                renderProducts();
                Swal.fire('✅ Oferta aplicada', '', 'success');
            }
        });
    });

    document.querySelectorAll('.admin-remove-discount').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index].discount = 0;
                saveProducts(products);
                renderAdminPanel();
                renderProducts();
                Swal.fire('ℹ️ Descuento removido', '', 'info');
            }
        });
    });

    document.querySelectorAll('.admin-delete-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            Swal.fire({
                title: '¿Eliminar producto?',
                text: "¡Esta acción no se puede deshacer!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    products = products.filter(p => p.id !== id);
                    saveProducts(products);
                    renderAdminPanel();
                    renderProducts();
                    Swal.fire('Eliminado', 'Producto eliminado.', 'success');
                }
            });
        });
    });
}

// Renderizar productos antiguos
function renderOldProducts() {
    const container = document.getElementById('oldProductsList');
    if (!container) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldProducts = products.filter(p => 
        !p.sold && 
        new Date(p.createdAt) < thirtyDaysAgo
    );

    if (oldProducts.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">No hay productos antiguos sin vender.</div></div>`;
        return;
    }

    container.innerHTML = oldProducts.map(product => {
        const daysOld = Math.floor((new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24));
        return `
            <div class="col-md-4">
                <div class="card h-100 border-warning">
                    <img src="${product.image}" 
                         onerror="this.src='https://via.placeholder.com/150x150/e0e0e0/999999?text=Sin+Imagen'; this.style.opacity='0.7'"
                         class="card-img-top" 
                         style="height: 150px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title">${product.name}</h6>
                        ${product.description ? `<p class="text-muted small">${product.description}</p>` : ''}
                        <p class="card-text">
                            <small class="text-muted">Días sin vender: ${daysOld}</small><br>
                            <strong>$${product.price.toFixed(2)}</strong>
                            ${product.maxInstallments > 0 ? `<br><small class="text-success">Cuotas: ${product.maxInstallments}</small>` : ''}
                            ${product.discount > 0 ? `<span class="badge bg-warning">-${product.discount}%</span>` : ''}
                        </p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-sm btn-warning admin-apply-discount-old" data-id="${product.id}">
                                Aplicar 30% OFF
                            </button>
                            <button class="btn btn-sm btn-danger admin-apply-liquidation" data-id="${product.id}">
                                Liquidar (50% OFF)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.admin-apply-discount-old').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index].discount = 30;
                saveProducts(products);
                renderAdminPanel();
                renderProducts();
                Swal.fire('🔥 Oferta aplicada', '30% de descuento activado.', 'success');
            }
        });
    });

    document.querySelectorAll('.admin-apply-liquidation').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index].discount = 50;
                saveProducts(products);
                renderAdminPanel();
                renderProducts();
                Swal.fire('💥 ¡LIQUIDACIÓN!', '50% de descuento activado.', 'success');
            }
        });
    });
}

// Aplicar descuento masivo
document.getElementById('applyDiscountToOld')?.addEventListener('click', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let count = 0;
    products = products.map(p => {
        if (!p.sold && new Date(p.createdAt) < thirtyDaysAgo) {
            p.discount = 30;
            count++;
        }
        return p;
    });

    if (count > 0) {
        saveProducts(products);
        renderAdminPanel();
        renderProducts();
        Swal.fire('✅ Ofertas aplicadas', `${count} productos con 30% OFF.`, 'success');
    } else {
        Swal.fire('ℹ️ Info', 'No hay productos elegibles.', 'info');
    }
});

// Aplicar liquidación masiva
document.getElementById('applyLiquidationToOld')?.addEventListener('click', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let count = 0;
    products = products.map(p => {
        if (!p.sold && new Date(p.createdAt) < thirtyDaysAgo) {
            p.discount = 50;
            count++;
        }
        return p;
    });

    if (count > 0) {
        saveProducts(products);
        renderAdminPanel();
        renderProducts();
        Swal.fire('💥 ¡LIQUIDACIÓN MASIVA!', `${count} productos con 50% OFF.`, 'success');
    } else {
        Swal.fire('ℹ️ Info', 'No hay productos elegibles.', 'info');
    }
});

// Agregar nuevo producto
document.getElementById('addProductForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const name = formData.get('name');
    const category = formData.get('category');
    const price = parseFloat(formData.get('price'));
    const maxInstallments = parseInt(formData.get('maxInstallments')) || 0;
    const description = formData.get('description') || '';
    const imageFile = formData.get('productImage');

    if (!name || !category || isNaN(price) || !imageFile) {
        Swal.fire('Error', 'Completa todos los campos correctamente.', 'error');
        return;
    }

    try {
        const base64Image = await readFileAsBase64(imageFile);

        let lastId = parseInt(localStorage.getItem(STORAGE_KEY_LAST_ID) || '0');
        lastId++;
        localStorage.setItem(STORAGE_KEY_LAST_ID, lastId.toString());

        const newProduct = {
            id: lastId,
            name,
            category,
            price,
            image: base64Image,
            sold: false,
            discount: 0,
            description: description,
            maxInstallments: maxInstallments,
            createdAt: new Date().toISOString()
        };

        products.push(newProduct);
        saveProducts(products);
        renderAdminPanel();
        renderProducts();

        this.reset();

        Swal.fire('✅ Producto agregado', `¡${name} está listo para venderse!`, 'success');
    } catch (error) {
        Swal.fire('Error', 'No se pudo leer la imagen. Intenta con otro archivo.', 'error');
    }
});

// Función para leer archivo como base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Renderizar historial de ventas
function renderSalesHistory() {
    const container = document.getElementById('salesHistoryList');
    if (!container) return;

    const sales = getSalesHistory();

    if (sales.length === 0) {
        container.innerHTML = `<div class="alert alert-info">No hay ventas registradas aún.</div>`;
        return;
    }

    container.innerHTML = sales.reverse().map(sale => {
        const itemsList = sale.items.map(item => 
            `<li>${item.name} - $${(item.price * (1 - item.discount/100)).toFixed(2)}</li>`
        ).join('');

        return `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <strong>Venta #${sale.id}</strong> - ${new Date(sale.date).toLocaleString()}
                </div>
                <div class="card-body">
                    <p><strong>Cliente:</strong> ${sale.customer.name} (Cédula: ${sale.customer.id})</p>
                    <p><strong>Teléfono:</strong> ${sale.customer.phone}</p>
                    <p><strong>Dirección:</strong> ${sale.customer.address}, ${sale.customer.city}</p>
                    <p><strong>Total:</strong> $${sale.total.toFixed(2)} ${sale.installments ? ' (en cuotas)' : ''}</p>
                    <ul>${itemsList}</ul>
                </div>
            </div>
        `;
    }).join('');
}

// Renderizar clientes — ¡CORREGIDO!
function renderClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;

    const clients = getClients();

    let html = '';
    if (clients.length === 0) {
        html = `<div class="alert alert-info">No hay clientes registrados.</div>`;
    } else {
        html = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Cédula</th>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Ciudad</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clients.map(client => `
                            <tr>
                                <td>${client.id}</td>
                                <td>${client.name}</td>
                                <td>${client.phone}</td>
                                <td>${client.city}</td>
                                <td>
                                    <span class="badge ${client.status === 'al_dia' ? 'bg-success' : 'bg-warning'}">
                                        ${client.status === 'al_dia' ? 'Al día' : 'Deudor'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary client-status-btn" data-id="${client.id}" data-status="${client.status}">
                                        ${client.status === 'al_dia' ? 'Marcar como deudor' : 'Marcar como al día'}
                                    </button>
                                    <button class="btn btn-sm btn-outline-info ms-1 view-account-btn" data-id="${client.id}">
                                        Cuenta
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    container.innerHTML = `
        <button class="btn btn-primary mb-3" id="addClientBtn">+ Agregar Cliente</button>
        ${html}
    `;

    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('client-status-btn')) {
            const id = e.target.getAttribute('data-id');
            const currentStatus = e.target.getAttribute('data-status');
            const newStatus = currentStatus === 'al_dia' ? 'deudor' : 'al_dia';

            let clients = getClients();
            const clientIndex = clients.findIndex(c => c.id === id);
            if (clientIndex !== -1) {
                clients[clientIndex].status = newStatus;
                saveClients(clients);
                renderClients();
                Swal.fire('✅ Estado actualizado', '', 'success');
            }
        }

        if (e.target.classList.contains('view-account-btn')) {
            const clientId = e.target.getAttribute('data-id');
            viewClientAccount(clientId);
        }
    });

    const addBtn = document.getElementById('addClientBtn');
    if (addBtn && !addBtn.dataset.initialized) {
        addBtn.dataset.initialized = 'true';
        addBtn.addEventListener('click', function() {
            const adminModal = bootstrap.Modal.getInstance(document.getElementById('adminPanelModal'));
            if (adminModal) {
                adminModal.hide();
            }

            setTimeout(() => {
                Swal.fire({
                    title: 'Agregar Cliente',
                    html: `
                        <input id="swal-client-id" class="swal2-input" placeholder="Cédula" required>
                        <input id="swal-client-name" class="swal2-input" placeholder="Nombre completo" required>
                        <input id="swal-client-phone" class="swal2-input" placeholder="Teléfono" required>
                        <input id="swal-client-address" class="swal2-input" placeholder="Dirección" required>
                        <input id="swal-client-city" class="swal2-input" placeholder="Ciudad" required>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'Agregar',
                    cancelButtonText: 'Cancelar',
                    didOpen: () => {
                        const firstInput = document.getElementById('swal-client-id');
                        if (firstInput) {
                            firstInput.focus();
                            setTimeout(() => firstInput.focus(), 100);
                        }
                    },
                    preConfirm: () => {
                        const id = document.getElementById('swal-client-id').value;
                        const name = document.getElementById('swal-client-name').value;
                        const phone = document.getElementById('swal-client-phone').value;
                        const address = document.getElementById('swal-client-address').value;
                        const city = document.getElementById('swal-client-city').value;

                        if (!id || !name || !phone || !address || !city) {
                            Swal.showValidationMessage('Completa todos los campos');
                            return false;
                        }

                        return { id, name, phone, address, city };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const { id, name, phone, address, city } = result.value;
                        let clients = getClients();
                        
                        if (clients.some(c => c.id === id)) {
                            Swal.fire('⚠️ Cliente existente', 'Ya existe un cliente con esa cédula.', 'warning');
                            return;
                        }

                        clients.push({
                            id,
                            name,
                            phone,
                            address,
                            city,
                            status: 'al_dia',
                            createdAt: new Date().toISOString()
                        });
                        saveClients(clients);
                        
                        setTimeout(() => {
                            const modal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
                            renderAdminPanel();
                            modal.show();
                        }, 300);
                    } else {
                        setTimeout(() => {
                            const modal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
                            renderAdminPanel();
                            modal.show();
                        }, 300);
                    }
                });
            }, 300);
        });
    }
}

// Renderizar resumen de cuentas
function renderAccountsOverview() {
    const container = document.getElementById('accountsList');
    if (!container) return;

    const clients = getClients();
    const sales = getSalesHistory().filter(s => s.installments);
    const payments = getPayments();

    if (clients.length === 0) {
        container.innerHTML = `<div class="col-12"><div class="alert alert-info">No hay clientes registrados.</div></div>`;
        return;
    }

    container.innerHTML = clients.map(client => {
        const clientSales = sales.filter(s => s.customer.id === client.id);
        const clientPayments = payments.filter(p => p.clientId === client.id);
        
        const totalDebt = clientSales.reduce((sum, sale) => {
            const installments = sale.maxInstallments || 1;
            const paid = clientPayments.filter(p => p.saleId === sale.id).length;
            const pending = Math.max(0, installments - paid);
            return sum + (sale.total / installments) * pending;
        }, 0);

        const overdue = clientSales.some(sale => {
            const installments = sale.maxInstallments || 1;
            const paid = clientPayments.filter(p => p.saleId === sale.id).length;
            const dueDate = new Date(sale.date);
            dueDate.setMonth(dueDate.getMonth() + paid);
            return paid < installments && dueDate < new Date();
        });

        return `
            <div class="col-md-6">
                <div class="card ${overdue ? 'border-danger' : 'border-info'}">
                    <div class="card-body">
                        <h6>${client.name}</h6>
                        <p class="mb-1"><small>Cédula: ${client.id}</small></p>
                        <p class="mb-1">Ventas en cuotas: ${clientSales.length}</p>
                        <p class="mb-1">Deuda pendiente: $${totalDebt.toFixed(2)}</p>
                        <span class="badge ${overdue ? 'bg-danger' : 'bg-success'}">
                            ${overdue ? 'Con retrasos' : 'Al día'}
                        </span>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary view-account-btn" data-id="${client.id}">
                                Ver Cuenta
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-account-btn')) {
            const clientId = e.target.getAttribute('data-id');
            viewClientAccount(clientId);
        }
    });
}

// Renderizar configuración de WhatsApp
function renderWhatsappSettings() {
    const currentNumber = getWhatsappNumber();
    const displayElement = document.getElementById('currentWhatsappNumber');
    if (displayElement) {
        displayElement.textContent = currentNumber;
    }

    const form = document.getElementById('whatsappConfigForm');
    if (form) {
        document.getElementById('whatsappNumber').value = currentNumber;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const newNumber = document.getElementById('whatsappNumber').value.trim();

            if (!newNumber.startsWith('+') || !/^\+\d{8,}$/.test(newNumber)) {
                Swal.fire('Error', 'El número debe empezar con + y tener al menos 8 dígitos.', 'error');
                return;
            }

            saveWhatsappNumber(newNumber);
            renderWhatsappSettings();
            Swal.fire('✅ ¡Número actualizado!', `Los pedidos se enviarán a ${newNumber}`, 'success');
        });
    }
}

// Renderizar configuración de tienda
function renderStoreConfig() {
    const config = getStoreConfig();
    const nameInput = document.getElementById('storeName');
    const currentName = document.getElementById('currentStoreName');
    const currentLogo = document.getElementById('currentStoreLogo');

    if (nameInput) nameInput.value = config.name;
    if (currentName) currentName.textContent = config.name;
    if (currentLogo) currentLogo.src = config.logo;

    const form = document.getElementById('storeConfigForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newName = document.getElementById('storeName').value.trim();
            const logoFile = document.getElementById('storeLogo').files[0];

            if (!newName) {
                Swal.fire('Error', 'El nombre de la tienda es obligatorio.', 'error');
                return;
            }

            let newLogo = config.logo;
            if (logoFile) {
                try {
                    newLogo = await readFileAsBase64(logoFile);
                } catch (error) {
                    Swal.fire('Error', 'No se pudo leer el logo. Intenta con otro archivo.', 'error');
                    return;
                }
            }

            const newConfig = {
                name: newName,
                logo: newLogo
            };

            saveStoreConfig(newConfig);
            Swal.fire('✅ ¡Configuración guardada!', 'La tienda ha sido actualizada.', 'success');
        });
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    updateStoreUI();
    renderProducts();
    updateCartCount();

    const currentProducts = getProducts();
    let changed = false;
    cart = cart.filter(item => {
        const current = currentProducts.find(p => p.id === item.id);
        if (!current || current.sold) {
            changed = true;
            return false;
        }
        return true;
    });

    if (changed) {
        saveCart(cart);
        updateCartCount();
    }
});