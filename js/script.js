// Finalizar compra — ¡REFACTORIZADA Y SIN DUPLICADOS!
function checkout() {
    if (cart.length === 0) {
        Swal.fire('Carrito vacío', 'Agrega productos antes de finalizar.', 'warning');
        return;
    }

    // Verificar productos vendidos
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

    // Cerrar modal del carrito
    const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
    if (cartModal) {
        cartModal.hide();
    }

    setTimeout(() => {
        // Configurar campos según tienda
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

                // Registrar cliente si es CrediHogar y no existe
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

                // Calcular total y generar mensaje
                let total = 0;
                const itemsList = cart.map(item => {
                    const finalPrice = item.price * (1 - item.discount / 100);
                    total += finalPrice;
                    if (isHogar && data.installments) {
                        const cuotas = Math.min(3, item.maxInstallments || 1);
                        return `• ${item.name} - $${finalPrice.toFixed(2)} (en ${cuotas} cuotas)`;
                    }
                    return `• ${item.name} - $${finalPrice.toFixed(2)}`;
                }).join('%0A');

                const config = getStoreConfig();
                let message = '';
                if (isHogar) {
                    message = `
Hola, quiero hacer un pedido en ${config.name}.%0A
%0A
*DATOS DEL CLIENTE*%0A
Nombre: ${data.name}%0A
Cédula: ${data.id}%0A
Dirección: ${data.address}%0A
Ciudad: ${data.city}%0A
Teléfono: ${data.phone}%0A
%0A
*PRODUCTOS*%0A
${itemsList}%0A
%0A
*TOTAL: $${total.toFixed(2)}*%0A
${data.installments ? '*PAGO EN CUOTAS*' : '*PAGO CONTADO*'}%0A
%0A
¡Gracias!
                    `.trim();
                } else {
                    message = `
Hola, quiero hacer un pedido en ${config.name}.%0A
%0A
*DATOS DEL CLIENTE*%0A
Nombre: ${data.name}%0A
Dirección: ${data.address}%0A
Teléfono: ${data.phone}%0A
%0A
*PRODUCTOS SELECCIONADOS*%0A
${itemsList}%0A
%0A
*TOTAL A PAGAR: $${total.toFixed(2)}*%0A
%0A
¡Gracias! Espero su confirmación para vestir con amor a mi peque 🧸
                    `.trim();
                }

                // ✅ DEFINIR whatsappUrl (¡SIEMPRE!)
                const whatsappNumber = getWhatsappNumber();
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

                // Registrar venta (solo en CrediHogar)
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

                    // Marcar como deudor si es en cuotas
                    if (data.installments) {
                        const clients = getClients();
                        const clientIndex = clients.findIndex(c => c.id === data.id);
                        if (clientIndex !== -1) {
                            clients[clientIndex].status = 'deudor';
                            saveClients(clients);
                        }
                    }
                }

                // Marcar productos como vendidos (común para ambas tiendas)
                cart.forEach(cartItem => {
                    const index = products.findIndex(p => p.id === cartItem.id);
                    if (index !== -1) {
                        products[index].sold = true;
                    }
                });

                // Guardar estado (común)
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