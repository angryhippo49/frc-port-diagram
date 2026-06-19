 function switchTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');

            // Initialize wiring canvas if switching to wiring tab
            if (tabName === 'wiring') {
                setTimeout(() => initWiringCanvas(), 0);
            }
        }

    
        // PORT DIAGRAM FUNCTIONALITY
        let ports = JSON.parse(localStorage.getItem('froPorts')) || [];

        function renderTable() {
            const container = document.getElementById('tableContainer');
            const portColName = document.getElementById('portColumnName').value || 'Port Number';
            const deviceColName = document.getElementById('deviceColumnName').value || 'Device Connected';

            if (ports.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No ports yet. Click "+ Add Port" to get started!</p>
                    </div>
                `;
                return;
            }

            let html = `
                <table class="port-table">
                    <thead>
                        <tr>
                            <th style="width: 40%;">${escapeHtml(portColName)}</th>
                            <th style="width: 50%;">${escapeHtml(deviceColName)}</th>
                            <th style="width: 10%;"></th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            ports.forEach((port, index) => {
                html += `
                    <tr>
                        <td><input type="text" value="${escapeHtml(port.name)}" onchange="updatePort(${index}, 'name', this.value)" placeholder="e.g. PWM 0"></td>
                        <td><input type="text" value="${escapeHtml(port.device)}" onchange="updatePort(${index}, 'device', this.value)" placeholder="e.g. Drive Motor"></td>
                        <td><button class="delete-btn" onclick="deletePort(${index})">Delete</button></td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;
        }

        function addPort() {
            ports.push({ name: '', device: '' });
            savePorts();
            renderTable();
        }

        function updatePort(index, field, value) {
            if (ports[index]) {
                ports[index][field] = value;
                savePorts();
            }
        }

        function deletePort(index) {
            ports.splice(index, 1);
            savePorts();
            renderTable();
        }

        function clearAllPorts() {
            if (confirm('Are you sure? This will delete all ports.')) {
                ports = [];
                savePorts();
                renderTable();
            }
        }

        function savePorts() {
            localStorage.setItem('froPorts', JSON.stringify(ports));
        }

        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        function downloadPortImage() {
            if (ports.length === 0) {
                alert('Add some ports first!');
                return;
            }

            const portColName = document.getElementById('portColumnName').value || 'Port Number';
            const deviceColName = document.getElementById('deviceColumnName').value || 'Device Connected';

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const padding = 40;
            const rowHeight = 50;
            const col1Width = 250;
            const col2Width = 350;
            const totalWidth = col1Width + col2Width + padding * 2;
            const totalHeight = (ports.length + 1) * rowHeight + padding * 2;

            canvas.width = totalWidth;
            canvas.height = totalHeight;

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#001a4d';
            ctx.lineWidth = 2;
            ctx.strokeRect(padding / 2, padding / 2, totalWidth - padding, totalHeight - padding);

            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#001a4d';

            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(padding / 2, padding / 2, totalWidth - padding, rowHeight);
            ctx.fillStyle = '#001a4d';
            ctx.fillText(portColName, padding + 15, padding + 35);
            ctx.fillText(deviceColName, padding + col1Width + 15, padding + 35);

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;

            ctx.font = '14px Arial';
            ports.forEach((port, index) => {
                const y = padding / 2 + (index + 1) * rowHeight;
                
                ctx.beginPath();
                ctx.moveTo(padding / 2, y);
                ctx.lineTo(totalWidth - padding / 2, y);
                ctx.stroke();

                ctx.fillStyle = '#333';
                ctx.fillText(port.name || '-', padding + 15, y + 35);
                ctx.fillText(port.device || '-', padding + col1Width + 15, y + 35);
            });

            ctx.beginPath();
            ctx.moveTo(padding / 2 + col1Width, padding / 2);
            ctx.lineTo(padding / 2 + col1Width, totalHeight - padding / 2);
            ctx.stroke();

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'frc-port-diagram.png';
            link.click();
        }

        document.getElementById('portColumnName').addEventListener('change', () => {
            localStorage.setItem('frcPortColName', document.getElementById('portColumnName').value);
        });

        document.getElementById('deviceColumnName').addEventListener('change', () => {
            localStorage.setItem('frcDeviceColName', document.getElementById('deviceColumnName').value);
        });

        const savedPortColName = localStorage.getItem('frcPortColName');
        const savedDeviceColName = localStorage.getItem('frcDeviceColName');
        if (savedPortColName) document.getElementById('portColumnName').value = savedPortColName;
        if (savedDeviceColName) document.getElementById('deviceColumnName').value = savedDeviceColName;

        // ============================================
        // WIRING DIAGRAM FUNCTIONALITY
        // ============================================
        let canvas;
        let ctx;
        let isDrawing = false;
        let currentTool = 'wire';
        let wireColor = '#000000';
        let wireThickness = 2;
        let drawing = [];
        let startX, startY;

        function initWiringCanvas() {
            canvas = document.getElementById('wiringCanvas');
            if (!canvas) return;
            
            ctx = canvas.getContext('2d');

            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = Math.max(400, window.innerHeight - 400);

            redrawCanvas();

            canvas.addEventListener('mousedown', handleCanvasMouseDown);
            canvas.addEventListener('mousemove', handleCanvasMouseMove);
            canvas.addEventListener('mouseup', handleCanvasMouseUp);
            canvas.addEventListener('mouseleave', handleCanvasMouseUp);

            canvas.addEventListener('touchstart', handleCanvasTouch);
            canvas.addEventListener('touchmove', handleCanvasTouch);
            canvas.addEventListener('touchend', handleCanvasTouchEnd);
        }

        function selectTool(tool) {
            currentTool = tool;
        }

        function updateWireColor() {
            wireColor = document.getElementById('wireColor').value;
        }

        function updateWireThickness() {
            wireThickness = parseInt(document.getElementById('wireThickness').value);
        }

        function handleCanvasMouseDown(e) {
            const rect = canvas.getBoundingClientRect();
            startX = (e.clientX - rect.left) * (canvas.width / rect.width);
            startY = (e.clientY - rect.top) * (canvas.height / rect.height);
            isDrawing = true;
        }

        function handleCanvasMouseMove(e) {
            if (!isDrawing) return;

            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);

            redrawCanvas();

            if (currentTool === 'wire') {
                ctx.strokeStyle = wireColor;
                ctx.lineWidth = wireThickness;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }

        function handleCanvasMouseUp(e) {
            if (!isDrawing) return;
            isDrawing = false;

            const rect = canvas.getBoundingClientRect();
            const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const endY = (e.clientY - rect.top) * (canvas.height / rect.height);

            if (currentTool === 'wire') {
                drawing.push({
                    type: 'wire',
                    x1: startX,
                    y1: startY,
                    x2: endX,
                    y2: endY,
                    color: wireColor,
                    thickness: wireThickness
                });
            } else if (currentTool === 'component') {
                const size = parseInt(document.getElementById('componentSize').value);
                drawing.push({
                    type: 'component',
                    x: startX,
                    y: startY,
                    size: size
                });
            } else if (currentTool === 'label') {
                const text = prompt('Enter label text:', 'Label');
                if (text) {
                    drawing.push({
                        type: 'label',
                        x: startX,
                        y: startY,
                        text: text
                    });
                }
            }

            redrawCanvas();
            saveWiring();
        }

        function handleCanvasTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        }

        function handleCanvasTouchEnd(e) {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        }

        function redrawCanvas() {
            if (!ctx) return;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < canvas.width; i += 50) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += 50) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }

            drawing.forEach(item => {
                if (item.type === 'wire') {
                    ctx.strokeStyle = item.color;
                    ctx.lineWidth = item.thickness;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(item.x1, item.y1);
                    ctx.lineTo(item.x2, item.y2);
                    ctx.stroke();
                } else if (item.type === 'component') {
                    ctx.fillStyle = '#2ecc71';
                    ctx.strokeStyle = '#001a4d';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else if (item.type === 'label') {
                    ctx.fillStyle = '#001a4d';
                    ctx.font = 'bold 14px Arial';
                    ctx.fillText(item.text, item.x, item.y);
                }
            });
        }

        function undoWiring() {
            if (drawing.length > 0) {
                drawing.pop();
                redrawCanvas();
                saveWiring();
            }
        }

        function clearWiring() {
            if (confirm('Are you sure? This will delete all wiring.')) {
                drawing = [];
                redrawCanvas();
                saveWiring();
            }
        }

        function saveWiring() {
            localStorage.setItem('frcWiring', JSON.stringify(drawing));
        }

        function loadWiring() {
            const saved = localStorage.getItem('frcWiring');
            if (saved) {
                drawing = JSON.parse(saved);
            }
        }

        function downloadWiringImage() {
            if (drawing.length === 0) {
                alert('Create a wiring diagram first!');
                return;
            }

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'frc-wiring-diagram.png';
            link.click();
        }

        // Initialize
        renderTable();
        loadWiring();
  
