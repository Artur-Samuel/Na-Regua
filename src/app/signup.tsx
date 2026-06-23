import { Link, router } from "expo-router"
import { useState } from "react"
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { Button } from "../components/button"
import { Input } from "../components/input"
import { signup } from "../services/api"

export default function Signup(){

    const [nome, setNome] = useState("")
    const [email, setEmail] = useState("")
    const [senha, setSenha] = useState("")
    const [telefone, setTelefone] = useState("")
    const [tipo, setTipo] = useState("cliente")

    async function handleSignup(){

        if(!nome || !email || !senha){
            return Alert.alert("Erro", "Preencha os campos obrigatórios")
        }

        try{
            const data = await signup(nome, email, senha, telefone, tipo)

            if(data.status === "success"){
                Alert.alert("Sucesso", "Conta criada!")
                router.replace("/")
            }else{
                Alert.alert("Erro", data.message || "Erro ao cadastrar")
            }
        }catch{
            Alert.alert("Erro", "Falha na conexão com o servidor")
        }
    }

    return(
        <View style={styles.container}>

            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>
                Preencha os dados para começar
            </Text>

            <View style={styles.form}>
                <Input placeholder="Nome" onChangeText={setNome}/>
                <Input placeholder="E-mail" onChangeText={setEmail}/>
                <Input placeholder="Senha" secureTextEntry onChangeText={setSenha}/>
                <Input placeholder="Telefone (opcional)" onChangeText={setTelefone}/>
            </View>

            {/* Seleção de tipo */}
            <Text style={styles.label}>Tipo de conta</Text>

            <View style={styles.tipoContainer}>
                <TouchableOpacity
                    style={[
                        styles.tipoButton,
                        tipo === "cliente" && styles.tipoAtivo
                    ]}
                    onPress={() => setTipo("cliente")}
                >
                    <Text style={[
                        styles.tipoText,
                        tipo === "cliente" && styles.tipoTextAtivo
                    ]}>
                        Cliente
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tipoButton,
                        tipo === "barbeiro" && styles.tipoAtivo
                    ]}
                    onPress={() => setTipo("barbeiro")}
                >
                    <Text style={[
                        styles.tipoText,
                        tipo === "barbeiro" && styles.tipoTextAtivo
                    ]}>
                        Barbeiro
                    </Text>
                </TouchableOpacity>
            </View>

            <Button label="Cadastrar" onPress={handleSignup}/>

            <Text style={styles.footer}>
                Já tem conta?{" "}
                <Link href="/" style={styles.link}>
                    Fazer login
                </Link>
            </Text>

        </View>
    )
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        padding:24,
        justifyContent:"center",
        backgroundColor:"#FDFDFD"
    },

    title:{
        fontSize:28,
        fontWeight:"bold",
        marginBottom:4
    },

    subtitle:{
        fontSize:14,
        color:"#666",
        marginBottom:20
    },

    form:{
        gap:12,
        marginBottom:20
    },

    label:{
        fontSize:14,
        marginBottom:8,
        color:"#444"
    },

    tipoContainer:{
        flexDirection:"row",
        gap:10,
        marginBottom:20
    },

    tipoButton:{
        flex:1,
        height:45,
        borderWidth:1,
        borderColor:"#DDD",
        borderRadius:8,
        alignItems:"center",
        justifyContent:"center"
    },

    tipoAtivo:{
        backgroundColor:"#3366FF",
        borderColor:"#3366FF"
    },

    tipoText:{
        color:"#333"
    },

    tipoTextAtivo:{
        color:"#FFF",
        fontWeight:"bold"
    },

    footer:{
        textAlign:"center",
        marginTop:20,
        color:"#666"
    },

    link:{
        color:"#3366FF",
        fontWeight:"bold"
    }
})