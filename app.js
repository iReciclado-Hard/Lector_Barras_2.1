document.addEventListener('DOMContentLoaded', () => {
    const codeReader = new ZXing.BrowserMultiFormatReader();
    const videoElement = document.getElementById('video-preview');
    const beepSound = document.getElementById('beep-sound');
    const resultElement = document.getElementById('result');
    const productListElement = document.getElementById('productList');
    const totalElement = document.getElementById('total-suggested');
    let totalSuggestedPrice = 0;
    let scanning = false;

    document.getElementById('startScan').addEventListener('click', () => {
        if (!scanning) {
            resultElement.innerText = "Escaneando...";
            resultElement.style.display = 'block';
            videoElement.style.display = 'block'; // Asegura que el video esté visible

            codeReader.decodeFromVideoDevice(undefined, 'video-preview', (result, err) => {
                if (result) {
                    beepSound.play();
                    resultElement.innerText = `Último Código Escaneado: ${result.text}`;
                    resultElement.style.display = 'block';
                    codeReader.reset(); // Detener el escaneo después de encontrar un código
                    scanning = false;
                    videoElement.style.display = 'none'; // Ocultar la vista del escáner después de escanear
                    findProductData(result.text).then(productData => displayProductData(productData));
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error('Error al escanear el código:', err);
                }
            });
            scanning = true;
        }
    });

    document.getElementById('stopScan').addEventListener('click', () => {
        if (scanning) {
            codeReader.reset(); // Detener el escaneo
            scanning = false;
            resultElement.style.display = 'none';
            videoElement.style.display = 'none'; // Ocultar la vista del escáner al detener
        }
    });

    // Función para obtener datos de Google Sheets
    async function fetchSheetData() {
        const sheetId = '1OyOanAl_4iX9iOZcAjdbkpOZ4NdeU20dgicUSuxxwds'; // Reemplaza con el ID de tu hoja de Google
        const sheetName = 'Hoja1'; // Reemplaza con el nombre de la hoja
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=AIzaSyDm6d6BmC8Kco00EspVcmpUHIzxu0K5vG4`; // Reemplaza TU_API_KEY con tu clave de API de Google

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al obtener los datos');
            const data = await response.json();
            return data.values; // Devuelve los valores de la hoja de cálculo
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            return null;
        }
    }

    // Función para encontrar datos del producto por código
    async function findProductData(code) {
        const data = await fetchSheetData();
        if (!data) return null;

        const header = data[0]; // La primera fila se asume que es el encabezado de las columnas
        const rows = data.slice(1); // Las filas de datos, omitiendo el encabezado

        for (const row of rows) {
            const rowData = {};
            row.forEach((cell, index) => {
                rowData[header[index]] = cell; // Mapea las celdas de cada fila a sus respectivos nombres de columna
            });

            if (rowData['BarCode'] === code) { // Busca en la columna "Código de Barras"
                return rowData; // Devuelve la fila completa como un objeto si encuentra el código
            }
        }
        return null; // Devuelve null si no se encuentra el código
    }

    // Función para mostrar los datos del producto en la página
    function displayProductData(productData) {
        const productItem = document.createElement('div');
        productItem.classList.add('product-item');

        const productInfo = document.createElement('div');
        productInfo.classList.add('product-info');

        if (productData) {
            // Añade la información del producto sin las etiquetas
            ['Descripcion', 'Precio', 'Sugerido'].forEach(key => {
                const p = document.createElement('p');
                p.innerText = `${productData[key]}`;
                if (key === 'Sugerido') {
                    p.classList.add('sugerido');
                    // Actualiza el total de los precios sugeridos
                    totalSuggestedPrice += parseFloat(productData[key]);
                    updateTotalSuggestedPrice();
                }
                productInfo.appendChild(p);
            });
        } else {
            const p = document.createElement('p');
            p.innerText = `Producto no encontrado.`;
            productInfo.appendChild(p);
        }

        // Botón para eliminar el producto
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.innerText = 'Eliminar';
        deleteButton.addEventListener('click', () => {
            if (productData && productData['Sugerido']) {
                totalSuggestedPrice -= parseFloat(productData['Sugerido']);
                updateTotalSuggestedPrice();
            }
            productListElement.removeChild(productItem);
        });

        productItem.appendChild(productInfo);
        productItem.appendChild(deleteButton);
        productListElement.appendChild(productItem);
    }

    // Función para actualizar el total de los precios sugeridos
    function updateTotalSuggestedPrice() {
        totalElement.innerText = `Total Sugerido: $${totalSuggestedPrice.toFixed(2)}`;
    }
});
