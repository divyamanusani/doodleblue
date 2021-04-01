async function loginUser() {
    if (!validateDropdown()) {
        return;
    }
    let data = {
        email: document.getElementById('form-username').value,
        password: document.getElementById('form-password').value,
        userType: document.getElementById('form-user-type').value
    }
    localStorage.setItem('userData', JSON.stringify(data));


    await fetch('http://localhost:3000/login', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-type': 'application/json',
        }
    }).then(res => {

        if (res.status == 200) {
            alert('login success');
            console.log(JSON.parse(localStorage.getItem('userData')));
            let loggedUser = JSON.parse(localStorage.getItem('userData'));
            fetchUserDetails(loggedUser);
        }
        else {
            alert('login failed. Your email or password credentials do not match. Please try again or register. Status' + res.status);
        }
    })
}

let validateDropdown = () => {
    let e = document.getElementById("form-user-type");
    let optionSelIndex = e.options[e.selectedIndex].value;
    if (optionSelIndex == 0) {
        alert("Please select a usertype");
        e.focus();
        return false;
    }
    return true;
}

async function registerUser() {
    if (!validateRegisterDropdown()) {
        return;
    }
    let fname = document.getElementById('form-first-name').value;
    let lname = document.getElementById('form-last-name').value;
    let data = {
        name: fname + lname,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        userType: 'endUser',
        loanAmount: document.getElementById('form-user-loan').value,
        userStatus: document.getElementById('form-user-status').value
    }
    await fetch('http://localhost:3000/register', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-type': 'application/json'
        }
    }).then(res => {
        if (res.status == 400)
            alert('User already exists!!Please Sign in');
        else if (res.status == 200)
            alert('User Registered successfully!!')
    })
}

let validateRegisterDropdown = () => {
    let e = document.getElementById("form-user-loan");
    let k = document.getElementById("form-user-status");
    let optionSelIndex = e.options[e.selectedIndex].value;
    let optionSelIndex1 = k.options[k.selectedIndex].value;
    if (optionSelIndex == 0) {
        alert("Please select the loan amount");
        e.focus();
        return false;
    }
    if (optionSelIndex1 == 0) {
        alert("Please select the user status");
        k.focus();
        return false;
    }
    return true;
}

let fetchUserDetails = async (myUser) => {
    let userData = await fetch('http://localhost:3000/users');
    let allUserData = await userData.json();
    let loggedUserData = allUserData.filter((user) => user.email === myUser.email);
    if (loggedUserData[0].userType === 'endUser') {
        gotoUserPage(loggedUserData[0].userId);
    }

    else if (loggedUserData[0].userType === 'customerManager') {
        gotoCustomerManagerPage(loggedUserData[0].name);
    }

    else if (loggedUserData[0].userType === 'bankManager') {
        gotoBankManagerPage();
    }
}

function gotoUserPage(userId) {
    window.open('http://localhost:3000/endusers/' + userId);
}

function gotoCustomerManagerPage(name){
    window.open('http://localhost:3000/customerManager/' + name);
}

function gotoBankManagerPage(){
    window.open('http://localhost:3000/bankManager');
}




